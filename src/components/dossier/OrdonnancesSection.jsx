
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Save, Printer, RefreshCw, Edit, Trash2, Mail } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { genererPdfEtOuvrirEmail } from "./PdfEmailHelper"; // Updated import

export default function OrdonnancesSection({ patientId, patient }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [editingOrdonnance, setEditingOrdonnance] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId,
    date_ordonnance: new Date().toISOString(),
    type_ordonnance: "Medicaments",
    contenu: "",
    modele_utilise: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { email: 'default@user.com' });
    };
    loadUser();
  }, []);

  const canCreate = true; // Always true
  const canPrintOrEmail = true; // Always true

  const { data: ordonnances, isLoading } = useQuery({
    queryKey: ['ordonnances', patientId],
    queryFn: async () => {
      const allOrdonnances = await base44.entities.Ordonnance.list('-date_ordonnance');
      return allOrdonnances.filter(o => o.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: modeles } = useQuery({
    queryKey: ['modeles-ordonnance'],
    queryFn: () => base44.entities.ModeleOrdonnance.list(),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-print'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createOrdonnanceMutation = useMutation({
    mutationFn: (data) => base44.entities.Ordonnance.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordonnances', patientId] });
      setShowDialog(false);
      setEditingOrdonnance(null);
      setFormData({
        patient_id: patientId,
        date_ordonnance: new Date().toISOString(),
        type_ordonnance: "Medicaments",
        contenu: "",
        modele_utilise: ""
      });
      toast.success("Ordonnance créée avec succès");
      return data; // Return data to be used in handleSaveAndPrint
    },
    onError: (error) => {
      console.error("Error creating ordonnance:", error);
      toast.error("Erreur lors de la création de l'ordonnance");
      throw error; // Rethrow to propagate error
    }
  });

  const updateOrdonnanceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Ordonnance.update(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ordonnances', patientId] });
      setShowDialog(false);
      setEditingOrdonnance(null);
      setFormData({
        patient_id: patientId,
        date_ordonnance: new Date().toISOString(),
        type_ordonnance: "Medicaments",
        contenu: "",
        modele_utilise: ""
      });
      toast.success("Ordonnance mise à jour avec succès");
      return data; // Return data to be used in handleSaveAndPrint
    },
    onError: (error) => {
      console.error("Error updating ordonnance:", error);
      toast.error("Erreur lors de la mise à jour de l'ordonnance");
      throw error; // Rethrow to propagate error
    }
  });

  const deleteOrdonnanceMutation = useMutation({
    mutationFn: (id) => base44.entities.Ordonnance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordonnances', patientId] });
      toast.success("Ordonnance supprimée avec succès");
    },
    onError: (error) => {
      console.error("Error deleting ordonnance:", error);
      toast.error("Erreur lors de la suppression de l'ordonnance");
    }
  });

  const updatePatientStatutMutation = useMutation({
    mutationFn: (statut) => base44.entities.Patient.update(patientId, { statut_salle_attente: statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      toast.success("Statut du patient mis à jour avec succès");
    },
    onError: (error) => {
      console.error("Error updating patient status:", error);
      toast.error("Erreur lors de la mise à jour du statut du patient");
    }
  });

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        handleTerminer();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const handleTerminer = async () => {
    await updatePatientStatutMutation.mutateAsync('termine');
    navigate(createPageUrl("SalleAttente"));
  };

  const handleModeleChange = (modeleId) => {
    const modele = modeles.find(m => m.id === modeleId);
    if (modele) {
      setFormData({
        ...formData,
        type_ordonnance: modele.type,
        contenu: modele.contenu,
        modele_utilise: modele.nom_modele
      });
    }
  };

  const handleSave = async () => {
    if (!canCreate) return;
    if (editingOrdonnance) {
      await updateOrdonnanceMutation.mutateAsync({ id: editingOrdonnance.id, data: formData });
    } else {
      await createOrdonnanceMutation.mutateAsync(formData);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!canCreate) return;
    let ordonnanceToPrint = formData;
    try {
      if (editingOrdonnance) {
        const updated = await updateOrdonnanceMutation.mutateAsync({ id: editingOrdonnance.id, data: formData });
        ordonnanceToPrint = { ...editingOrdonnance, ...updated }; // Use updated data for print
      } else {
        const createdOrdonnance = await createOrdonnanceMutation.mutateAsync(formData);
        ordonnanceToPrint = createdOrdonnance;
      }
      
      setTimeout(() => {
        imprimerOrdonnance(ordonnanceToPrint);
      }, 300);
    } catch (error) {
      // Error handled by mutations' onError
    }
  };

  const handleModifierEtImprimer = (ordonnance) => {
    if (!canCreate) return;
    setFormData({
      patient_id: patientId,
      date_ordonnance: ordonnance.date_ordonnance,
      type_ordonnance: ordonnance.type_ordonnance,
      contenu: ordonnance.contenu,
      modele_utilise: ordonnance.modele_utilise || ""
    });
    setEditingOrdonnance(ordonnance);
    setShowDialog(true);
  };

  const handleRenouveler = async (ordonnance) => {
    if (!canCreate) return;
    
    const nouvelleOrdonnance = {
      patient_id: patientId,
      date_ordonnance: new Date().toISOString(),
      type_ordonnance: ordonnance.type_ordonnance,
      contenu: ordonnance.contenu,
      modele_utilise: ordonnance.modele_utilise
    };
    
    try {
      const createdOrdonnance = await createOrdonnanceMutation.mutateAsync(nouvelleOrdonnance);
      setTimeout(() => {
        imprimerOrdonnance(createdOrdonnance);
      }, 300);
    } catch (error) {
      // Error handled by mutations' onError
    }
  };

  const handleDelete = (ordonnance) => {
    if (!canCreate) return;
    
    const dateOrdonnance = new Date(ordonnance.date_ordonnance);
    const maintenant = new Date();
    const differenceHeures = (maintenant - dateOrdonnance) / (1000 * 60 * 60);
    
    if (differenceHeures > 24) {
      toast.error("Impossible de supprimer une ordonnance de plus de 24 heures.");
      return;
    }
    
    if (confirm('Voulez-vous vraiment supprimer cette ordonnance ?')) {
      deleteOrdonnanceMutation.mutate(ordonnance.id);
    }
  };

  const genererHtmlOrdonnance = (ordonnance) => {
    const medecin = users.find(u => u.specialite === 'admin' || u.specialite === 'ophtalmologue') || currentUser;
    const entete = medecin?.entete_ordonnance || '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #ffffff;
          }
          .header {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #333;
          }
          .header img {
            max-width: 100%;
            height: auto;
          }
          .title {
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            margin: 30px 0;
            text-transform: uppercase;
          }
          .patient-info {
            margin: 20px 0;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .patient-info p {
            margin: 5px 0;
          }
          .ordonnance-type {
            margin: 20px 0;
            padding: 10px;
            background-color: #e8f5e9;
            border-left: 4px solid #4caf50;
          }
          .contenu {
            margin: 30px 0;
            white-space: pre-wrap;
            line-height: 1.8;
            font-size: 14px;
          }
          .signature {
            margin-top: 60px;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${entete ? `<img src="${entete}" alt="En-tête" style="max-width: 100%; height: auto;" />` : '<p style="text-align: center; font-size: 18px; font-weight: bold;">Cabinet d\'Ophtalmologie</p>'}
        </div>
        
        <div class="title">Ordonnance</div>
        
        <div class="patient-info">
          <p><strong>Patient(e) :</strong> ${patient.prenom} ${patient.nom}</p>
          ${patient.date_naissance ? `<p><strong>Date de naissance :</strong> ${format(new Date(patient.date_naissance), 'dd/MM/yyyy')}</p>` : ''}
          <p><strong>Date :</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        
        <div class="ordonnance-type">
          <strong>Type :</strong> ${ordonnance.type_ordonnance?.replace(/_/g, ' ') || 'Ordonnance'}
        </div>
        
        <div class="contenu">
${ordonnance.contenu}
        </div>
        
        <div class="signature">
          <p>Le ${format(new Date(), 'dd/MM/yyyy')}</p>
          ${medecin?.signature_image_url ? `<img src="${medecin.signature_image_url}" alt="Signature" style="max-width: 200px; margin-top: 10px;" />` : '<p style="margin-top: 60px; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">Signature</p>'}
        </div>
      </body>
      </html>
    `;
  };

  const imprimerOrdonnance = (ordonnance) => {
    const htmlContent = genererHtmlOrdonnance(ordonnance);
    
    const printWindow = window.open('', '_blank');
    let finalHtml = htmlContent.replace('<head>', `<head><title>Ordonnance - ${patient.prenom} ${patient.nom}</title>`);
    finalHtml = finalHtml.replace('<body>', '<body onload="window.print(); window.close();">');
    printWindow.document.write(finalHtml);
    printWindow.document.close();
  };

  const handleEnvoyerEmail = async (ordonnance) => {
    if (!patient.email) {
      toast.error("Le patient n'a pas d'adresse email renseignée");
      return;
    }
    
    const user = await base44.auth.me();
    const messagePersonnalise = user?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre ordonnance.\n\nCordialement,";
    
    const htmlContent = genererHtmlOrdonnance(ordonnance);
    const sujet = `Ordonnance - ${ordonnance.type_ordonnance?.replace(/_/g, ' ')}`;
    const nomFichier = `Ordonnance_${ordonnance.type_ordonnance}_${patient.nom}_${patient.prenom}_${format(new Date(), 'yyyyMMdd')}`;
    
    try {
      await genererPdfEtOuvrirEmail(htmlContent, patient.email, sujet, nomFichier, messagePersonnalise);
      toast.success("PDF généré et email préparé avec succès");
    } catch (error) {
      console.error('Erreur lors de la préparation du PDF et de l\'email:', error);
      toast.error("Erreur lors de la génération ou de l'ouverture de l'email.");
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Ordonnances</h2>
        {canCreate && (
          <Button
            onClick={() => {
              setEditingOrdonnance(null);
              setFormData({
                patient_id: patientId,
                date_ordonnance: new Date().toISOString(),
                type_ordonnance: "Medicaments",
                contenu: "",
                modele_utilise: ""
              });
              setShowDialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle ordonnance
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : ordonnances.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Aucune ordonnance enregistrée
            </CardContent>
          </Card>
        ) : (
          ordonnances.map((ordonnance) => {
            const dateOrdonnance = new Date(ordonnance.date_ordonnance);
            const maintenant = new Date();
            const differenceHeures = (maintenant - dateOrdonnance) / (1000 * 60 * 60);
            const peutSupprimer = canCreate && differenceHeures <= 24;
            
            return (
              <Card key={ordonnance.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">
                        {ordonnance.type_ordonnance?.replace(/_/g, ' ')}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {format(new Date(ordonnance.date_ordonnance), 'dd/MM/yyyy à HH:mm')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canPrintOrEmail && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1"
                            onClick={() => imprimerOrdonnance(ordonnance)}
                            title="Imprimer"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEnvoyerEmail(ordonnance)}
                            title={patient.email ? "Envoyer par email" : "Email patient non renseigné"}
                            disabled={!patient.email}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {canCreate && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRenouveler(ordonnance)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            title="Renouveler"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleModifierEtImprimer(ordonnance)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Modifier et imprimer"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDelete(ordonnance)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title={peutSupprimer ? "Supprimer" : "Suppression impossible après 24h"}
                            disabled={!peutSupprimer}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="bg-white border rounded-lg p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                      {ordonnance.contenu}
                    </pre>
                  </div>
                  {ordonnance.modele_utilise && (
                    <p className="text-xs text-gray-500 mt-3">
                      Modèle utilisé: {ordonnance.modele_utilise}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open);
        if (!open) {
          setEditingOrdonnance(null);
        }
      }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingOrdonnance ? "Modifier l'ordonnance" : "Nouvelle ordonnance"}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type d'ordonnance</Label>
                <Select
                  value={formData.type_ordonnance}
                  onValueChange={(value) => setFormData({ ...formData, type_ordonnance: value })}
                  disabled={!canCreate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Medicaments">Médicaments</SelectItem>
                    <SelectItem value="Examens_complementaires">Examens complémentaires</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Modèle prérempli (optionnel)</Label>
                <Select onValueChange={handleModeleChange} disabled={!canCreate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {modeles
                      .filter(m => m.type === formData.type_ordonnance)
                      .map(modele => (
                        <SelectItem key={modele.id} value={modele.id}>
                          {modele.nom_modele}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Contenu de l'ordonnance</Label>
              <Textarea
                value={formData.contenu}
                onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                rows={20}
                className="font-mono"
                disabled={!canCreate}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowDialog(false);
                setEditingOrdonnance(null);
              }}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.contenu || !canCreate}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </Button>
              <Button 
                onClick={handleSaveAndPrint}
                disabled={!formData.contenu || !canCreate}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
                title="Enregistrer et imprimer (F5)"
              >
                <Printer className="w-4 h-4" />
                Enregistrer et imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
