import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Trash2, CheckCircle, Clock, AlertTriangle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const prioriteConfig = {
  basse: { label: "Basse", color: "bg-gray-100 text-gray-800", icon: Clock },
  normale: { label: "Normale", color: "bg-blue-100 text-blue-800", icon: Clock },
  haute: { label: "Haute", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  urgente: { label: "Urgente", color: "bg-red-100 text-red-800", icon: AlertTriangle }
};

const statutConfig = {
  en_attente: { label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-800" },
  termine: { label: "Terminé", color: "bg-green-100 text-green-800" }
};

export default function DossiersATraiter() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [searchPatient, setSearchPatient] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  const [newDossier, setNewDossier] = useState({
    patient_id: "",
    assigne_a: "",
    motif: "Ordonnance lunettes",
    note: "",
    statut: "en_attente",
    priorite: "normale"
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
      setNewDossier(prev => ({ ...prev, assigne_a: user.email }));
    };
    loadUser();
  }, []);

  const { data: dossiers } = useQuery({
    queryKey: ['dossiers-a-traiter'],
    queryFn: () => base44.entities.DossierATraiter.list('-created_date'),
    initialData: [],
  });

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createDossierMutation = useMutation({
    mutationFn: (data) => base44.entities.DossierATraiter.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers-a-traiter'] });
      setShowDialog(false);
      setNewDossier({
        patient_id: "",
        assigne_a: currentUser?.email || "",
        motif: "Ordonnance lunettes",
        note: "",
        statut: "en_attente",
        priorite: "normale"
      });
      setSelectedPatient(null);
      setSearchPatient("");
    },
  });

  const updateDossierMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DossierATraiter.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers-a-traiter'] });
    },
  });

  const deleteDossierMutation = useMutation({
    mutationFn: (id) => base44.entities.DossierATraiter.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers-a-traiter'] });
    },
  });

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setNewDossier({ ...newDossier, patient_id: patient.id });
    setSearchPatient("");
  };

  const handleCreateDossier = () => {
    if (!newDossier.patient_id || !newDossier.assigne_a) return;
    createDossierMutation.mutate(newDossier);
  };

  const handleUpdateStatut = (dossierId, nouveauStatut) => {
    updateDossierMutation.mutate({
      id: dossierId,
      data: { statut: nouveauStatut }
    });
  };

  const filteredPatients = patients.filter(p => 
    searchPatient && (
      p.nom?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      p.prenom?.toLowerCase().includes(searchPatient.toLowerCase())
    )
  );

  const mesDossiers = dossiers.filter(d => d.assigne_a === currentUser?.email);
  const tousLesDossiers = dossiers;

  const isAdmin = currentUser?.specialite === 'admin';

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dossiers à traiter</h1>
              <p className="text-gray-500 mt-1">Gestion des dossiers en attente de traitement</p>
            </div>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Ajouter un dossier
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Mes dossiers</p>
                  <p className="text-3xl font-bold text-blue-600">{mesDossiers.filter(d => d.statut !== 'termine').length}</p>
                </div>
                <User className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          {isAdmin && (
            <>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total en attente</p>
                      <p className="text-3xl font-bold text-orange-600">{tousLesDossiers.filter(d => d.statut === 'en_attente').length}</p>
                    </div>
                    <Clock className="w-8 h-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total terminés</p>
                      <p className="text-3xl font-bold text-green-600">{tousLesDossiers.filter(d => d.statut === 'termine').length}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? "Tous les dossiers" : "Mes dossiers à traiter"}</CardTitle>
          </CardHeader>
          <CardContent>
            {(isAdmin ? tousLesDossiers : mesDossiers).length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p>Aucun dossier à traiter</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(isAdmin ? tousLesDossiers : mesDossiers).map((dossier) => {
                  const patient = patients.find(p => p.id === dossier.patient_id);
                  const assigneA = users.find(u => u.email === dossier.assigne_a);
                  const priorite = prioriteConfig[dossier.priorite] || prioriteConfig.normale;
                  const statut = statutConfig[dossier.statut] || statutConfig.en_attente;
                  const PrioriteIcon = priorite.icon;

                  return (
                    <Card key={dossier.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div 
                            className="flex-1 cursor-pointer"
                            onClick={() => navigate(createPageUrl(`DossierPatient?id=${dossier.patient_id}`))}
                          >
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <h3 className="font-semibold text-lg">
                                {patient ? `${patient.prenom} ${patient.nom}` : "Patient inconnu"}
                              </h3>
                              <Badge className={priorite.color}>
                                <PrioriteIcon className="w-3 h-3 mr-1" />
                                {priorite.label}
                              </Badge>
                              <Badge className={statut.color}>
                                {statut.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {dossier.motif}
                              </Badge>
                            </div>

                            {dossier.note && (
                              <p className="text-sm text-gray-600 mb-2">{dossier.note}</p>
                            )}

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Assigné à: {assigneA?.full_name || dossier.assigne_a}</span>
                              <span>Créé le: {format(new Date(dossier.created_date), 'dd/MM/yyyy')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Select
                              value={dossier.statut}
                              onValueChange={(value) => handleUpdateStatut(dossier.id, value)}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en_attente">En attente</SelectItem>
                                <SelectItem value="en_cours">En cours</SelectItem>
                                <SelectItem value="termine">Terminé</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteDossierMutation.mutate(dossier.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un dossier à traiter</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Patient *</Label>
                {selectedPatient ? (
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="font-medium">
                      {selectedPatient.prenom} {selectedPatient.nom}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPatient(null);
                        setNewDossier({ ...newDossier, patient_id: "" });
                      }}
                    >
                      Changer
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      placeholder="Rechercher un patient par nom ou prénom..."
                    />
                    {filteredPatients.length > 0 && (
                      <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
                        {filteredPatients.map((patient) => (
                          <div
                            key={patient.id}
                            onClick={() => handleSelectPatient(patient)}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                          >
                            <p className="font-medium">{patient.prenom} {patient.nom}</p>
                            {patient.date_naissance && (
                              <p className="text-xs text-gray-500">
                                {format(new Date(patient.date_naissance), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <Label>Motif *</Label>
                <Select
                  value={newDossier.motif}
                  onValueChange={(value) => setNewDossier({ ...newDossier, motif: value })}
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
                <Label>Priorité</Label>
                <Select
                  value={newDossier.priorite}
                  onValueChange={(value) => setNewDossier({ ...newDossier, priorite: value })}
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
                <Label>Assigner à *</Label>
                <Select
                  value={newDossier.assigne_a}
                  onValueChange={(value) => setNewDossier({ ...newDossier, assigne_a: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.email}>
                        {user.full_name} ({user.specialite})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Note</Label>
                <Textarea
                  value={newDossier.note}
                  onChange={(e) => setNewDossier({ ...newDossier, note: e.target.value })}
                  rows={3}
                  placeholder="Note additionnelle..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Annuler
                </Button>
                <Button
                  onClick={handleCreateDossier}
                  disabled={!newDossier.patient_id || !newDossier.assigne_a}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Créer le dossier
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}