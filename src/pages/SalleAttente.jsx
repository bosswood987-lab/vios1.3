
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, UserPlus, Clock, CheckCircle, Eye, Cake, MapPin, Phone, Droplet } from "lucide-react";
import { format, differenceInMinutes, differenceInYears } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const statutConfig = {
  en_attente: { 
    label: "En attente", 
    color: "bg-yellow-100 text-yellow-800 border-yellow-300", 
    icon: Clock 
  },
  vu_orthoptiste: { 
    label: "Vu par l'orthoptiste", 
    color: "bg-green-100 text-green-800 border-green-300", 
    icon: CheckCircle 
  },
  vu_ophtalmologue: { 
    label: "Vu par l'ophtalmologue", 
    color: "bg-red-100 text-red-800 border-red-300", 
    icon: Eye 
  },
  termine: { 
    label: "Terminé", 
    color: "bg-gray-100 text-gray-800 border-gray-300", 
    icon: CheckCircle 
  }
};

export default function SalleAttente() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [newPatient, setNewPatient] = useState({
    nom: "",
    prenom: "",
    genre: "Homme",
    date_naissance: "",
    telephone: "",
    adresse: "",
    statut_salle_attente: "en_attente",
    date_arrivee: new Date().toISOString()
  });

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients-salle-attente'],
    queryFn: async () => {
      const allPatients = await base44.entities.Patient.list('-date_arrivee');
      return allPatients.filter(p => p.statut_salle_attente !== 'termine');
    },
    refetchInterval: 30000,
    initialData: [],
  });

  const createPatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
      setShowDialog(false);
      setNewPatient({
        nom: "",
        prenom: "",
        genre: "Homme",
        date_naissance: "",
        telephone: "",
        adresse: "",
        statut_salle_attente: "en_attente",
        date_arrivee: new Date().toISOString()
      });
    },
  });

  const updateStatutMutation = useMutation({
    mutationFn: ({ id, statut }) => base44.entities.Patient.update(id, { statut_salle_attente: statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
    },
  });

  const handleAddPatient = () => {
    createPatientMutation.mutate(newPatient);
  };

  const getTempsAttente = (dateArrivee) => {
    if (!dateArrivee) return "N/A";
    const minutes = differenceInMinutes(new Date(), new Date(dateArrivee));
    if (minutes < 60) return `${minutes} min`;
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${heures}h ${mins}min`;
  };

  const getTempsDilatation = (heureDilatation) => {
    if (!heureDilatation) return "N/A";
    const minutes = differenceInMinutes(new Date(), new Date(heureDilatation));
    return `${minutes} min`;
  };

  const isDilatationActive = (heureDilatation) => {
    if (!heureDilatation) return false;
    const minutes = differenceInMinutes(new Date(), new Date(heureDilatation));
    return minutes <= 120; // Actif pendant 2 heures (120 minutes)
  };

  const getAge = (dateNaissance) => {
    if (!dateNaissance) return "N/A";
    return differenceInYears(new Date(), new Date(dateNaissance));
  };

  const isBirthday = (dateNaissance) => {
    if (!dateNaissance) return false;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Salle d'attente</h1>
            <p className="text-gray-500 mt-1">Gestion des patients en temps réel</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Nouveau patient
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {Object.entries(statutConfig).filter(([key]) => key !== 'termine').map(([key, config]) => {
            const count = patients.filter(p => p.statut_salle_attente === key).length;
            const Icon = config.icon;
            return (
              <Card key={key} className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{count}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patients en attente</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : patients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun patient en attente
              </div>
            ) : (
              <div className="space-y-3">
                {patients.map((patient) => {
                  const config = statutConfig[patient.statut_salle_attente];
                  const Icon = config.icon;
                  
                  return (
                    <div
                      key={patient.id}
                      onClick={() => navigate(createPageUrl(`DossierPatient?id=${patient.id}`))}
                      className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center gap-1">
                          {isBirthday(patient.date_naissance) && (
                            <Cake className="w-6 h-6 text-pink-500" title="Anniversaire aujourd'hui !" />
                          )}
                          {patient.en_dilatation && isDilatationActive(patient.heure_dilatation) && (
                            <div className="flex items-center gap-1 bg-cyan-100 text-cyan-700 px-2 py-1 rounded-full">
                              <Droplet className="w-4 h-4" />
                              <span className="text-xs font-semibold">{getTempsDilatation(patient.heure_dilatation)}</span>
                            </div>
                          )}
                          <div className={`w-12 h-12 bg-gradient-to-br ${
                            patient.genre === "Femme" ? "from-pink-500 to-rose-500" : 
                            patient.genre === "Homme" ? "from-blue-500 to-cyan-500" : 
                            "from-gray-500 to-gray-600"
                          } rounded-full flex items-center justify-center`}>
                            <span className="text-white font-bold text-lg">
                              {patient.prenom?.charAt(0)}{patient.nom?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">
                              {patient.prenom} {patient.nom}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={
                                patient.genre === "Femme" ? "bg-pink-50 text-pink-700 border-pink-200 text-xs" : 
                                patient.genre === "Homme" ? "bg-blue-50 text-blue-700 border-blue-200 text-xs" : 
                                "bg-gray-50 text-gray-700 text-xs"
                              }
                            >
                              {patient.genre}
                            </Badge>
                            {patient.ald && (
                              <Badge className="bg-red-500 text-white text-xs">
                                ALD
                              </Badge>
                            )}
                            {patient.cmu && (
                              <Badge className="bg-green-500 text-white text-xs">
                                CMU
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-gray-500 mt-1 flex-wrap">
                            {patient.date_arrivee && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTempsAttente(patient.date_arrivee)}
                              </span>
                            )}
                            {patient.date_naissance && (
                              <span>{getAge(patient.date_naissance)} ans</span>
                            )}
                            {patient.telephone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {patient.telephone}
                              </span>
                            )}
                            {patient.adresse && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate max-w-[200px]" title={patient.adresse}>
                                  {patient.adresse}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Select
                          value={patient.statut_salle_attente}
                          onValueChange={(value) => {
                            updateStatutMutation.mutate({ id: patient.id, statut: value });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statutConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <config.icon className="w-4 h-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        
                        <Badge className={`${config.color} border px-3 py-1`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un patient</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom *</Label>
                <Input
                  id="nom"
                  value={newPatient.nom}
                  onChange={(e) => setNewPatient({ ...newPatient, nom: e.target.value })}
                  placeholder="Nom du patient"
                />
              </div>
              <div>
                <Label htmlFor="prenom">Prénom *</Label>
                <Input
                  id="prenom"
                  value={newPatient.prenom}
                  onChange={(e) => setNewPatient({ ...newPatient, prenom: e.target.value })}
                  placeholder="Prénom du patient"
                />
              </div>
              <div>
                <Label htmlFor="genre">Genre</Label>
                <Select
                  value={newPatient.genre}
                  onValueChange={(value) => setNewPatient({ ...newPatient, genre: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Homme">Homme</SelectItem>
                    <SelectItem value="Femme">Femme</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="date_naissance">Date de naissance</Label>
                <Input
                  id="date_naissance"
                  type="date"
                  value={newPatient.date_naissance}
                  onChange={(e) => setNewPatient({ ...newPatient, date_naissance: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={newPatient.telephone}
                  onChange={(e) => setNewPatient({ ...newPatient, telephone: e.target.value })}
                  placeholder="Numéro de téléphone"
                />
              </div>
              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <Textarea
                  id="adresse"
                  value={newPatient.adresse}
                  onChange={(e) => setNewPatient({ ...newPatient, adresse: e.target.value })}
                  placeholder="Adresse du patient"
                  rows={2}
                />
              </div>
              <Button
                onClick={handleAddPatient}
                disabled={!newPatient.nom || !newPatient.prenom}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Ajouter à la salle d'attente
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
