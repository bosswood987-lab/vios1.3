import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, UserPlus, Calendar, Phone, Mail, Edit, CalendarPlus, Cake, MapPin, Shield, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInYears, format, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Patients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSuccessFeedback, setShowSuccessFeedback] = useState(false);
  const [feedbackPatientName, setFeedbackPatientName] = useState("");
  
  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    genre: "Homme",
    date_naissance: "",
    telephone: "",
    email: "",
    adresse: "",
    numero_securite_sociale: "",
    medecin_traitant: "",
    antecedents_medicaux: "",
    ald: false,
    cmu: false
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date'),
    initialData: [],
  });

  const createPatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      closeDialog();
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Patient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      closeDialog();
    },
  });

  const nouvelleConsultationMutation = useMutation({
    mutationFn: (patientId) => base44.entities.Patient.update(patientId, { 
      statut_salle_attente: 'en_attente',
      date_arrivee: new Date().toISOString()
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
    },
  });

  const openCreateDialog = () => {
    setEditingPatient(null);
    setFormData({
      nom: "",
      prenom: "",
      genre: "Homme",
      date_naissance: "",
      telephone: "",
      email: "",
      adresse: "",
      numero_securite_sociale: "",
      medecin_traitant: "",
      antecedents_medicaux: "",
      ald: false,
      cmu: false
    });
    setShowDialog(true);
  };

  const openEditDialog = (patient, e) => {
    e.stopPropagation();
    setEditingPatient(patient);
    setFormData({
      nom: patient.nom || "",
      prenom: patient.prenom || "",
      genre: patient.genre || "Homme",
      date_naissance: patient.date_naissance || "",
      telephone: patient.telephone || "",
      email: patient.email || "",
      adresse: patient.adresse || "",
      numero_securite_sociale: patient.numero_securite_sociale || "",
      medecin_traitant: patient.medecin_traitant || "",
      antecedents_medicaux: patient.antecedents_medicaux || "",
      ald: patient.ald || false,
      cmu: patient.cmu || false
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPatient(null);
    setFormData({
      nom: "",
      prenom: "",
      genre: "Homme",
      date_naissance: "",
      telephone: "",
      email: "",
      adresse: "",
      numero_securite_sociale: "",
      medecin_traitant: "",
      antecedents_medicaux: "",
      ald: false,
      cmu: false
    });
  };

  const handleSubmit = () => {
    if (editingPatient) {
      updatePatientMutation.mutate({ id: editingPatient.id, data: formData });
    } else {
      createPatientMutation.mutate(formData);
    }
  };

  const handleNouvelleConsultation = async (patient, e) => {
    e.stopPropagation();
    
    // Mettre le patient en salle d'attente
    await nouvelleConsultationMutation.mutateAsync(patient.id);
    
    // Vérifier la spécialité de l'utilisateur
    const isSecrétaire = currentUser?.specialite === 'secretaire';
    
    if (isSecrétaire) {
      // Animation de succès pour la secrétaire
      setFeedbackPatientName(`${patient.prenom} ${patient.nom}`);
      setShowSuccessFeedback(true);
      setTimeout(() => {
        setShowSuccessFeedback(false);
      }, 3000);
    } else {
      // Ouvrir le dossier pour admin, ophtalmo, orthoptiste
      navigate(createPageUrl(`DossierPatient?id=${patient.id}`));
    }
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

  const filteredPatients = patients.filter(p => {
    const search = searchTerm.toLowerCase();
    return (
      p.nom?.toLowerCase().includes(search) ||
      p.prenom?.toLowerCase().includes(search) ||
      p.telephone?.includes(search)
    );
  });

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {showSuccessFeedback && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top duration-300">
            <Card className="bg-green-50 border-green-200 shadow-lg">
              <CardContent className="flex items-center gap-3 py-3 px-6">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">Patient ajouté à la salle d'attente</p>
                  <p className="text-sm text-green-700">{feedbackPatientName}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Patients</h1>
            <p className="text-gray-500 mt-1">Gestion des dossiers patients</p>
          </div>
          <Button
            onClick={openCreateDialog}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Nouveau patient
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher un patient..."
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead className="w-[100px]">Genre</TableHead>
                <TableHead className="w-[150px]">Âge</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredPatients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    Aucun patient trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(createPageUrl(`DossierPatient?id=${patient.id}`))}
                  >
                    <TableCell>
                      <div className="flex flex-col items-center gap-1">
                        {isBirthday(patient.date_naissance) && (
                          <Cake className="w-5 h-5 text-pink-500" title="Anniversaire aujourd'hui !" />
                        )}
                        {patient.ald && (
                          <Badge className="bg-red-500 text-white text-xs px-1 py-0">ALD</Badge>
                        )}
                        {patient.cmu && (
                          <Badge className="bg-green-500 text-white text-xs px-1 py-0">CMU</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{patient.nom}</TableCell>
                    <TableCell>{patient.prenom}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          patient.genre === "Femme" ? "bg-pink-50 text-pink-700 border-pink-200" : 
                          patient.genre === "Homme" ? "bg-blue-50 text-blue-700 border-blue-200" : 
                          "bg-gray-50 text-gray-700"
                        }
                      >
                        {patient.genre}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{getAge(patient.date_naissance)} ans</span>
                        {patient.date_naissance && (
                          <span className="text-xs text-gray-500">
                            {format(new Date(patient.date_naissance), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3 text-gray-400" />
                        {patient.telephone || "-"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="truncate max-w-[200px]" title={patient.adresse}>
                          {patient.adresse || "-"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => openEditDialog(patient, e)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleNouvelleConsultation(patient, e)}
                          className="text-green-600 hover:text-green-700"
                          title={currentUser?.specialite === 'secretaire' 
                            ? "Ajouter à la salle d'attente" 
                            : "Ajouter à la salle d'attente et ouvrir le dossier"}
                        >
                          <CalendarPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={showDialog} onOpenChange={closeDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Modifier le patient" : "Nouveau patient"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="genre">Genre</Label>
                  <Select
                    value={formData.genre}
                    onValueChange={(value) => setFormData({ ...formData, genre: value })}
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
                    value={formData.date_naissance}
                    onChange={(e) => setFormData({ ...formData, date_naissance: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="adresse">Adresse</Label>
                <Textarea
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_securite_sociale">N° Sécurité sociale</Label>
                  <Input
                    id="numero_securite_sociale"
                    value={formData.numero_securite_sociale}
                    onChange={(e) => setFormData({ ...formData, numero_securite_sociale: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="medecin_traitant">Médecin traitant</Label>
                  <Input
                    id="medecin_traitant"
                    value={formData.medecin_traitant}
                    onChange={(e) => setFormData({ ...formData, medecin_traitant: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="antecedents_medicaux">Antécédents médicaux</Label>
                <Textarea
                  id="antecedents_medicaux"
                  value={formData.antecedents_medicaux}
                  onChange={(e) => setFormData({ ...formData, antecedents_medicaux: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Couverture sociale
                </Label>
                <div className="flex items-center gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="ald-switch"
                      checked={formData.ald}
                      onCheckedChange={(checked) => setFormData({ ...formData, ald: checked })}
                    />
                    <Label htmlFor="ald-switch" className="cursor-pointer">
                      ALD (Affection Longue Durée)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="cmu-switch"
                      checked={formData.cmu}
                      onCheckedChange={(checked) => setFormData({ ...formData, cmu: checked })}
                    />
                    <Label htmlFor="cmu-switch" className="cursor-pointer">
                      CMU (Couverture Maladie Universelle)
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={closeDialog}>
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!formData.nom || !formData.prenom}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingPatient ? "Modifier" : "Créer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}