
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User, Calendar, Phone, Mail, MapPin, Heart, Save, CheckCircle, X, Droplet, XCircle, AlertTriangle, Lock, Shield, FolderPlus } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format, differenceInMinutes } from "date-fns";

import ExamenOrthoptisteForm from "../components/dossier/ExamenOrthoptisteForm";
import ExamenOphtalmologieForm from "../components/dossier/ExamenOphtalmologieForm";
import ImagerieSection from "../components/dossier/ImagerieSection";
import OrdonnancesSection from "../components/dossier/OrdonnancesSection";
import CourriersSection from "../components/dossier/CourriersSection";
import CotationSection from "../components/dossier/CotationSection";
import OverviewSection from "../components/dossier/OverviewSection";
import TraitementsSection from "../components/dossier/TraitementsSection";
import LentillesSection from "../components/dossier/LentillesSection";
import IVTSection from "../components/dossier/IVTSection";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;
const LOCK_TIMEOUT = 15 * 60 * 1000;

export default function DossierPatient() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('id');
  const [activeTab, setActiveTab] = useState("overview");
  const [currentUser, setCurrentUser] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showCloturerConfirm, setShowCloturerConfirm] = useState(false);
  const [showDossierATraiterDialog, setShowDossierATraiterDialog] = useState(false);
  // Removed isLockedByOther and lockedByUser states
  const [dossierATraiterData, setDossierATraiterData] = useState({
    motif: "Autre",
    note: "",
    priorite: "normale"
  });
  
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  // Removed lockCheckIntervalRef
  const hasUnlockedRef = useRef(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { specialite: 'ophtalmologue', email: 'default@user.com', full_name: 'Utilisateur' });
    };
    loadUser();
  }, []);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.list();
      return patients.find(p => p.id === patientId);
    },
    enabled: !!patientId,
    refetchInterval: 5000,
  });

  const updatePatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.update(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
    },
  });

  const updatePatientStatutMutation = useMutation({
    mutationFn: (statut) => base44.entities.Patient.update(patientId, { statut_salle_attente: statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });

  const marquerDilatationMutation = useMutation({
    mutationFn: () => base44.entities.Patient.update(patientId, { 
      en_dilatation: true,
      heure_dilatation: new Date().toISOString(),
      statut_salle_attente: 'en_attente'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createDossierATraiterMutation = useMutation({
    mutationFn: (data) => base44.entities.DossierATraiter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers-a-traiter'] });
      setShowDossierATraiterDialog(false);
      toast.success("Dossier ajouté aux dossiers à traiter");
      setDossierATraiterData({
        motif: "Autre",
        note: "",
        priorite: "normale"
      });
    },
  });

  // Fonction pour sauvegarder et déverrouiller le dossier (simplified)
  const saveAndUnlockDossier = async () => {
    if (hasUnlockedRef.current) return;
    
    hasUnlockedRef.current = true;
    
    // Sauvegarder les modifications
    window.dispatchEvent(new CustomEvent('dossier-save'));
    
    // Attendre un peu pour que la sauvegarde se termine
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Removed dossier_ouvert_par update logic as locking system is removed
  };

  // Removed locking system useEffect:
  // useEffect(() => { ... }, [patient?.id, currentUser?.email]);

  // Gérer la sortie du dossier (navigation, fermeture, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      saveAndUnlockDossier();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveAndUnlockDossier();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      saveAndUnlockDossier();
    };
  }, [patientId]); // Removed isLockedByOther from dependencies

  // Détecter les changements de navigation
  useEffect(() => {
    return () => {
      saveAndUnlockDossier();
    };
  }, [location.pathname]);

  useEffect(() => {
    const resetInactivityTimer = () => {
      lastActivityRef.current = Date.now();
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      
      inactivityTimerRef.current = setTimeout(() => {
        // Condition `if (!isLockedByOther)` removed
        saveAndUnlockDossier();
        setTimeout(() => {
          navigate(createPageUrl("SalleAttente"));
        }, 500);
      }, INACTIVITY_TIMEOUT);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click', 'mousemove'];
    
    events.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [navigate]); // Removed isLockedByOther from dependencies

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        handleTerminer();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentUser]);

  const handleEnregistrer = () => {
    // Removed `if (isLockedByOther) return;`
    window.dispatchEvent(new CustomEvent('dossier-save'));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDilatation = async () => {
    // Removed `if (isLockedByOther) return;`
    window.dispatchEvent(new CustomEvent('dossier-save'));
    await new Promise(resolve => setTimeout(resolve, 300));
    await marquerDilatationMutation.mutateAsync();
    await saveAndUnlockDossier();
    navigate(createPageUrl("SalleAttente"));
  };

  const handleTerminer = async () => {
    // Removed `if (isLockedByOther) return;`
    window.dispatchEvent(new CustomEvent('dossier-save'));
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let nouveauStatut;
    if (currentUser?.specialite === 'orthoptiste') {
      nouveauStatut = 'vu_orthoptiste';
    } else if (currentUser?.specialite === 'ophtalmologue' || currentUser?.specialite === 'admin') {
      nouveauStatut = 'vu_ophtalmologue';
    } else if (currentUser?.specialite === 'secretaire') {
      nouveauStatut = 'termine';
    } else {
      nouveauStatut = 'vu_orthoptiste';
    }
    
    await updatePatientStatutMutation.mutateAsync(nouveauStatut);
    await saveAndUnlockDossier();
    navigate(createPageUrl("SalleAttente"));
  };

  const handleFermer = () => {
    setShowCloseConfirm(true);
  };

  const handleFermerSansSauvegarder = async () => {
    setShowCloseConfirm(false);
    await saveAndUnlockDossier();
    navigate(createPageUrl("SalleAttente"));
  };

  const handleFermerAvecSauvegarde = async () => {
    // Condition `if (!isLockedByOther)` removed
    window.dispatchEvent(new CustomEvent('dossier-save'));
    await new Promise(resolve => setTimeout(resolve, 300));
    setShowCloseConfirm(false);
    await saveAndUnlockDossier();
    navigate(createPageUrl("SalleAttente"));
  };

  const handleCloturerDossier = () => {
    // Removed `if (isLockedByOther) return;`
    setShowCloturerConfirm(true);
  };

  const handleConfirmCloturer = async () => {
    window.dispatchEvent(new CustomEvent('dossier-save'));
    await new Promise(resolve => setTimeout(resolve, 300));
    await updatePatientStatutMutation.mutateAsync('termine');
    setShowCloturerConfirm(false);
    await saveAndUnlockDossier();
    navigate(createPageUrl("SalleAttente"));
  };

  const handleToggleALD = (checked) => {
    // Removed `if (isLockedByOther) return;`
    updatePatientMutation.mutate({ ald: checked });
  };

  const handleToggleCMU = (checked) => {
    // Removed `if (isLockedByOther) return;`
    updatePatientMutation.mutate({ cmu: checked });
  };

  const handleTabChange = (newTab) => {
    // Condition `if (!isLockedByOther)` removed
    window.dispatchEvent(new CustomEvent('dossier-save'));
    setActiveTab(newTab);
  };

  const handleRetourSalleAttente = async () => {
    await saveAndUnlockDossier();
    navigate(createPageUrl("SalleAttente"));
  };

  const handleAjouterDossierATraiter = () => {
    setShowDossierATraiterDialog(true);
  };

  const handleConfirmerDossierATraiter = () => {
    createDossierATraiterMutation.mutate({
      patient_id: patientId,
      assigne_a: dossierATraiterData.assigne_a || currentUser?.email,
      motif: dossierATraiterData.motif,
      note: dossierATraiterData.note,
      priorite: dossierATraiterData.priorite,
      statut: "en_attente"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8">
        <div className="text-center">
          <p className="text-gray-600">Patient non trouvé</p>
          <Button onClick={() => navigate(createPageUrl("Patients"))} className="mt-4">
            Retour aux patients
          </Button>
        </div>
      </div>
    );
  }

  const isOphtalmologue = true; // Always true as per changes

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8 pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="fixed top-4 right-4 z-50">
          <Button 
            onClick={handleFermer}
            variant="outline"
            size="sm"
            className="gap-1 shadow-lg bg-white hover:bg-gray-50"
          >
            <X className="w-4 h-4" />
            Fermer
          </Button>
        </div>

        {/* Removed isLockedByOther alert */}

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 py-3 px-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleEnregistrer} 
                size="sm"
                className={saveSuccess ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                // Removed disabled={isLockedByOther}
              >
                <Save className="w-3 h-3 mr-1" />
                Enregistrer
              </Button>
              
              {isOphtalmologue && (
                <Button 
                  onClick={handleDilatation}
                  size="sm"
                  className="bg-cyan-600 hover:bg-cyan-700"
                  // Removed disabled={isLockedByOther}
                >
                  <Droplet className="w-3 h-3 mr-1" />
                  En dilatation
                </Button>
              )}
              
              <Button 
                onClick={handleTerminer}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                // Removed disabled={isLockedByOther}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Terminé (F5)
              </Button>

              <Button 
                onClick={handleCloturerDossier}
                size="sm"
                className="bg-red-600 hover:bg-red-700 gap-1"
                // Removed disabled={isLockedByOther}
              >
                <XCircle className="w-3 h-3" />
                Clôturer dossier
              </Button>
            </div>
            
            {saveSuccess && (
              <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                Enregistré
              </span>
            )}
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleRetourSalleAttente}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>

        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold">
                  {patient.prenom?.charAt(0)}{patient.nom?.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-2xl">
                    {patient.prenom} {patient.nom}
                  </CardTitle>
                  {patient.ald && (
                    <Badge className="bg-red-500 text-white">
                      ALD
                    </Badge>
                  )}
                  {patient.cmu && (
                    <Badge className="bg-green-500 text-white">
                      CMU
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/90">
                  {patient.date_naissance && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(patient.date_naissance), 'dd/MM/yyyy')}
                    </span>
                  )}
                  {patient.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {patient.telephone}
                    </span>
                  )}
                  {patient.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {patient.email}
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleAjouterDossierATraiter}
                variant="secondary"
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30 gap-2"
              >
                <FolderPlus className="w-4 h-4" />
                Dossier à traiter
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {patient.adresse && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Adresse</p>
                    <p className="text-gray-600">{patient.adresse}</p>
                  </div>
                </div>
              )}
              {patient.numero_securite_sociale && (
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">N° Sécurité sociale</p>
                    <p className="text-gray-600">{patient.numero_securite_sociale}</p>
                  </div>
                </div>
              )}
              {patient.medecin_traitant && (
                <div className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Médecin traitant</p>
                    <p className="text-gray-600">{patient.medecin_traitant}</p>
                  </div>
                </div>
              )}
              {patient.antecedents_medicaux && (
                <div className="flex items-start gap-2">
                  <Heart className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700">Antécédents médicaux</p>
                    <p className="text-gray-600">{patient.antecedents_medicaux}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-9 bg-white">
            <TabsTrigger value="overview">Aperçu</TabsTrigger>
            <TabsTrigger value="examen">Examen</TabsTrigger>
            <TabsTrigger value="imagerie">Imagerie</TabsTrigger>
            <TabsTrigger value="ordonnances">Ordonnances</TabsTrigger>
            <TabsTrigger value="traitements">Traitements</TabsTrigger>
            <TabsTrigger value="lentilles">Lentilles</TabsTrigger>
            {patient?.suivi_ivt && (
              <TabsTrigger value="ivt">IVT</TabsTrigger>
            )}
            <TabsTrigger value="courriers">Courriers</TabsTrigger>
            <TabsTrigger value="cotation">Cotation</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="overview">
              <OverviewSection patientId={patientId} patient={patient} />
            </TabsContent>

            <TabsContent value="examen">
              <div className="space-y-6">
                <ExamenOrthoptisteForm 
                  patientId={patientId} 
                  patient={patient}
                />
                <ExamenOphtalmologieForm 
                  patientId={patientId} 
                  patient={patient}
                />
              </div>
            </TabsContent>

            <TabsContent value="imagerie">
              <ImagerieSection 
                patientId={patientId} 
                patient={patient}
              />
            </TabsContent>

            <TabsContent value="ordonnances">
              <OrdonnancesSection 
                patientId={patientId} 
                patient={patient}
              />
            </TabsContent>

            <TabsContent value="traitements">
              <TraitementsSection 
                patientId={patientId} 
                patient={patient}
              />
            </TabsContent>

            <TabsContent value="lentilles">
              <LentillesSection 
                patientId={patientId} 
                patient={patient}
              />
            </TabsContent>

            {patient?.suivi_ivt && (
              <TabsContent value="ivt">
                <IVTSection 
                  patientId={patientId} 
                  patient={patient}
                />
              </TabsContent>
            )}

            <TabsContent value="courriers">
              <CourriersSection 
                patientId={patientId} 
                patient={patient}
              />
            </TabsContent>

            <TabsContent value="cotation">
              <CotationSection patientId={patientId} patient={patient} />
            </TabsContent>
          </div>
        </Tabs>

        <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Sauvegarder les modifications ?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Voulez-vous enregistrer vos modifications avant de fermer le dossier ?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleFermerSansSauvegarder}>
                  Ne pas sauvegarder
                </Button>
                <Button onClick={handleFermerAvecSauvegarde} className="bg-blue-600 hover:bg-blue-700">
                  Sauvegarder et fermer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showCloturerConfirm} onOpenChange={setShowCloturerConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                Clôturer le dossier
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Cette action va <strong>sauvegarder les modifications</strong>, marquer le dossier comme <strong>terminé</strong> et retirer le patient de la salle d'attente.
              </p>
              <p className="text-sm text-gray-600">
                Voulez-vous continuer ?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCloturerConfirm(false)}>
                  Annuler
                </Button>
                <Button onClick={handleConfirmCloturer} className="bg-red-600 hover:bg-red-700">
                  <XCircle className="w-4 h-4 mr-2" />
                  Clôturer le dossier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDossierATraiterDialog} onOpenChange={setShowDossierATraiterDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                Ajouter aux dossiers à traiter
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Motif *</Label>
                <Select
                  value={dossierATraiterData.motif}
                  onValueChange={(value) => setDossierATraiterData({ ...dossierATraiterData, motif: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Programmation opératoire">Programmation opératoire</SelectItem>
                    <SelectItem value="Ordonnance lunettes">Ordonnance lunettes</SelectItem>
                    <SelectItem value="Compte rendu">Compte rendu</SelectItem>
                    <SelectItem value="Suivi post-opératoire">Suivi post-opératoire</SelectItem>
                    <SelectItem value="Imagerie à analyser">Imagerie à analyser</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Assigner à</Label>
                <Select
                  value={dossierATraiterData.assigne_a || currentUser?.email}
                  onValueChange={(value) => setDossierATraiterData({ ...dossierATraiterData, assigne_a: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={currentUser?.email}>
                      Moi ({currentUser?.full_name})
                    </SelectItem>
                    {users
                      .filter(u => u.email !== currentUser?.email)
                      .map(user => (
                        <SelectItem key={user.id} value={user.email}>
                          {user.full_name} ({user.specialite})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Priorité</Label>
                <Select
                  value={dossierATraiterData.priorite}
                  onValueChange={(value) => setDossierATraiterData({ ...dossierATraiterData, priorite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basse">Basse</SelectItem>
                    <SelectItem value="normale">Normale</SelectItem>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Note</Label>
                <Textarea
                  value={dossierATraiterData.note}
                  onChange={(e) => setDossierATraiterData({ ...dossierATraiterData, note: e.target.value })}
                  rows={3}
                  placeholder="Note additionnelle..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDossierATraiterDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleConfirmerDossierATraiter}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
