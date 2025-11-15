
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
import { Plus, Trash2, Settings, FileText, DollarSign, Eye, Shield, Globe, Upload, Image as ImageIcon, FileUp, Pill, Contact, Zap, Sparkles, User, Save, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { toast } from "sonner"; // Assuming sonner is the toast library used

export default function Gestion() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("actes");

  const [showModeleOrdonnanceDialog, setShowModeleOrdonnanceDialog] = useState(false);
  const [showModeleCourrierDialog, setShowModeleCourrierDialog] = useState(false);
  const [showActeMedicalDialog, setShowActeMedicalDialog] = useState(false);
  const [showRaccourciDialog, setShowRaccourciDialog] = useState(false);
  const [showAssociationDialog, setShowAssociationDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [showTraitementDialog, setShowTraitementDialog] = useState(false);
  const [showLentilleDialog, setShowLentilleDialog] = useState(false);
  const [showNomAffichageDialog, setShowNomAffichageDialog] = useState(false);
  const [nomAffichageTemp, setNomAffichageTemp] = useState("");
  const [showMessageEmailDialog, setShowMessageEmailDialog] = useState(false);
  const [messageEmailTemp, setMessageEmailTemp] = useState("");

  const [newModeleOrdonnance, setNewModeleOrdonnance] = useState({
    nom_modele: "",
    type: "Medicaments",
    contenu: "",
    is_global: false
  });

  const [newModeleCourrier, setNewModeleCourrier] = useState({
    nom_modele: "",
    objet: "",
    contenu: "",
    is_global: false
  });

  const [newActeMedical, setNewActeMedical] = useState({
    code: "",
    libelle: "",
    tarif_base: 0,
    specialite: "Commun"
  });

  const [newRaccourci, setNewRaccourci] = useState({
    nom: "",
    categorie: "lampe_fente",
    texte: "",
    is_global: false
  });

  const [newAssociation, setNewAssociation] = useState({
    nom: "",
    actes: []
  });

  const [newTraitement, setNewTraitement] = useState({
    nom_medicament: "",
    posologie: "",
    indication: "",
    is_global: false
  });

  const [newLentille, setNewLentille] = useState({
    marque: "",
    fabricant: "",
    type_renouvellement: "Mensuelle",
    rayon: "",
    diametre: "",
    texte_impression: "",
    is_global: false
  });

  const [showMegaRaccourciDialog, setShowMegaRaccourciDialog] = useState(false);
  const [newMegaRaccourci, setNewMegaRaccourci] = useState({
    nom: "",
    lampe_fente_od: "",
    lampe_fente_og: "",
    fond_oeil_od: "",
    fond_oeil_og: "",
    interpretation_imagerie: "",
    diagnostic: "",
    conduite_tenir: "",
    is_global: false
  });

  const [signatureData, setSignatureData] = useState({
    entete_ordonnance: "",
    signature_ordonnance: "",
    signature_image_url: "",
    template_word_url: ""
  });

  useEffect(() => {
    if (currentUser) {
      setSignatureData({
        entete_ordonnance: currentUser.entete_ordonnance || "",
        signature_ordonnance: currentUser.signature_ordonnance || "",
        signature_image_url: currentUser.signature_image_url || "",
        template_word_url: currentUser.template_word_url || ""
      });
      setNomAffichageTemp(currentUser?.nom_affichage || currentUser?.full_name || "");
      setMessageEmailTemp(currentUser?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre document médical.\n\nCordialement,");
    }
  }, [currentUser]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        setCurrentUser(user || { specialite: 'admin' });
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, [navigate]);

  const isAdmin = true; // Always true

  const { data: actesMedicaux } = useQuery({
    queryKey: ['actes-medicaux'],
    queryFn: () => base44.entities.ActeMedical.list(),
    initialData: [],
  });

  const { data: raccourcis } = useQuery({
    queryKey: ['raccourcis-examen'],
    queryFn: async () => {
      const all = await base44.entities.RaccourciExamen.list();
      return all.filter(r => r.is_global || r.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: modelesOrdonnances } = useQuery({
    queryKey: ['modeles-ordonnances'],
    queryFn: async () => {
      const all = await base44.entities.ModeleOrdonnance.list();
      return all.filter(m => m.is_global || m.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: modelesCourriers } = useQuery({
    queryKey: ['modeles-courriers'],
    queryFn: async () => {
      const all = await base44.entities.ModeleCourrier.list();
      return all.filter(m => m.is_global || m.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: associations } = useQuery({
    queryKey: ['associations-cotation'],
    queryFn: () => base44.entities.AssociationCotation.list(),
    initialData: [],
  });

  const { data: traitements } = useQuery({
    queryKey: ['traitements'],
    queryFn: async () => {
      const all = await base44.entities.Traitement.list();
      return all.filter(t => t.is_global || t.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: lentilles } = useQuery({
    queryKey: ['lentilles-contact'],
    queryFn: async () => {
      const all = await base44.entities.LentilleContact.list();
      return all.filter(l => l.is_global || l.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: megaRaccourcis } = useQuery({
    queryKey: ['mega-raccourcis'],
    queryFn: async () => {
      const all = await base44.entities.MegaRaccourci.list();
      return all.filter(r => r.is_global || r.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const createModeleOrdonnanceMutation = useMutation({
    mutationFn: (data) => base44.entities.ModeleOrdonnance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modeles-ordonnances'] });
      setShowModeleOrdonnanceDialog(false);
      setNewModeleOrdonnance({ nom_modele: "", type: "Medicaments", contenu: "", is_global: false });
    },
  });

  const deleteModeleOrdonnanceMutation = useMutation({
    mutationFn: (id) => base44.entities.ModeleOrdonnance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modeles-ordonnances'] });
    },
  });

  const createModeleCourrierMutation = useMutation({
    mutationFn: (data) => base44.entities.ModeleCourrier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modeles-courriers'] });
      setShowModeleCourrierDialog(false);
      setNewModeleCourrier({ nom_modele: "", objet: "", contenu: "", is_global: false });
    },
  });

  const deleteModeleCourrierMutation = useMutation({
    mutationFn: (id) => base44.entities.ModeleCourrier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modeles-courriers'] });
    },
  });

  const createActeMedicalMutation = useMutation({
    mutationFn: (data) => base44.entities.ActeMedical.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actes-medicaux'] });
      setShowActeMedicalDialog(false);
      setNewActeMedical({ code: "", libelle: "", tarif_base: 0, specialite: "Commun" });
    },
  });

  const deleteActeMedicalMutation = useMutation({
    mutationFn: (id) => base44.entities.ActeMedical.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actes-medicaux'] });
    },
  });

  const createRaccourciMutation = useMutation({
    mutationFn: (data) => base44.entities.RaccourciExamen.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raccourcis-examen'] });
      setShowRaccourciDialog(false);
      setNewRaccourci({ nom: "", categorie: "lampe_fente", texte: "", is_global: false });
    },
  });

  const deleteRaccourciMutation = useMutation({
    mutationFn: (id) => base44.entities.RaccourciExamen.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raccourcis-examen'] });
    },
  });

  const createAssociationMutation = useMutation({
    mutationFn: (data) => base44.entities.AssociationCotation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations-cotation'] });
      setShowAssociationDialog(false);
      setNewAssociation({ nom: "", actes: [] });
    },
  });

  const deleteAssociationMutation = useMutation({
    mutationFn: (id) => base44.entities.AssociationCotation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associations-cotation'] });
    },
  });

  const createTraitementMutation = useMutation({
    mutationFn: (data) => base44.entities.Traitement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traitements'] });
      setShowTraitementDialog(false);
      setNewTraitement({ nom_medicament: "", posologie: "", indication: "", is_global: false });
    },
  });

  const deleteTraitementMutation = useMutation({
    mutationFn: (id) => base44.entities.Traitement.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['traitements'] });
    },
  });

  const createLentilleMutation = useMutation({
    mutationFn: (data) => base44.entities.LentilleContact.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lentilles-contact'] });
      setShowLentilleDialog(false);
      setNewLentille({ marque: "", fabricant: "", type_renouvellement: "Mensuelle", rayon: "", diametre: "", texte_impression: "", is_global: false });
    },
  });

  const deleteLentilleMutation = useMutation({
    mutationFn: (id) => base44.entities.LentilleContact.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lentilles-contact'] });
    },
  });

  const createMegaRaccourciMutation = useMutation({
    mutationFn: (data) => base44.entities.MegaRaccourci.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-raccourcis'] });
      setShowMegaRaccourciDialog(false);
      setNewMegaRaccourci({
        nom: "",
        lampe_fente_od: "",
        lampe_fente_og: "",
        fond_oeil_od: "",
        fond_oeil_og: "",
        interpretation_imagerie: "",
        diagnostic: "",
        conduite_tenir: "",
        is_global: false
      });
    },
  });

  const deleteMegaRaccourciMutation = useMutation({
    mutationFn: (id) => base44.entities.MegaRaccourci.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mega-raccourcis'] });
    },
  });

  const updateSignatureMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowSignatureDialog(false);
      base44.auth.me().then(setCurrentUser);
    },
  });

  const updateNomAffichageMutation = useMutation({
    mutationFn: async (nom) => {
      return await base44.auth.updateMe({ nom_affichage: nom });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowNomAffichageDialog(false);
      const loadUser = async () => {
        const user = await base44.auth.me();
        setCurrentUser(user);
      };
      loadUser();
    },
  });

  const updateMessageEmailMutation = useMutation({
    mutationFn: async (message) => {
      return await base44.auth.updateMe({ message_email_pdf: message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      setShowMessageEmailDialog(false);
      const loadUser = async () => {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setMessageEmailTemp(user?.message_email_pdf || "");
      };
      loadUser();
      toast.success("Message email mis à jour");
    },
  });

  const ajouterActeAssociation = () => {
    setNewAssociation({
      ...newAssociation,
      actes: [...newAssociation.actes, { acte_id: "", depassement: 0 }]
    });
  };

  const retirerActeAssociation = (index) => {
    setNewAssociation({
      ...newAssociation,
      actes: newAssociation.actes.filter((_, i) => i !== index)
    });
  };

  const modifierActeAssociation = (index, field, value) => {
    const newActes = [...newAssociation.actes];
    newActes[index][field] = value;
    setNewAssociation({ ...newAssociation, actes: newActes });
  };

  const sauvegarderAssociation = () => {
    const actes_ids = newAssociation.actes.map(a => a.acte_id);
    const depassements = newAssociation.actes.map(a => parseFloat(a.depassement || 0));
    
    createAssociationMutation.mutate({
      nom: newAssociation.nom,
      actes_ids,
      depassements
    });
  };

  const handleUploadSignatureImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSignature(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSignatureData({ ...signatureData, signature_image_url: file_url });
    } catch (error) {
      console.error("Erreur upload signature:", error);
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleUploadEnteteImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingTemplate(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSignatureData({ ...signatureData, entete_ordonnance: file_url });
    } catch (error) {
      console.error("Erreur upload en-tête:", error);
    } finally {
      setUploadingTemplate(false);
    }
  };

  const handleSaveSignature = () => {
    updateSignatureMutation.mutate(signatureData);
  };

  const handleSaveNomAffichage = () => {
    updateNomAffichageMutation.mutate(nomAffichageTemp);
  };

  const handleSaveMessageEmail = () => {
    updateMessageEmailMutation.mutate(messageEmailTemp);
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

  const peutGererTout = true; // Always true
  const peutModifierNom = true; // Always true

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">Gestion</h1>
            </div>
            <p className="text-gray-500">
              Configurations et paramètres
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowNomAffichageDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Mon nom d'affichage
            </Button>
            <Button
              onClick={() => setShowMessageEmailDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Message email PDF
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4 gap-2 h-auto">
            <TabsTrigger value="actes" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Actes
            </TabsTrigger>
            <TabsTrigger value="associations" className="gap-2">
              <Eye className="w-4 h-4" />
              Associations
            </TabsTrigger>
            <TabsTrigger value="raccourcis" className="gap-2">
              <Zap className="w-4 h-4" />
              Raccourcis Examen
            </TabsTrigger>
            <TabsTrigger value="mega-raccourcis" className="gap-2">
              <Sparkles className="w-4 h-4" />
              Méga Raccourcis
            </TabsTrigger>
            <TabsTrigger value="ordonnances" className="gap-2">
              <FileText className="w-4 h-4" />
              Ordonnances
            </TabsTrigger>
            <TabsTrigger value="courriers" className="gap-2">
              <FileText className="w-4 h-4" />
              Courriers
            </TabsTrigger>
            <TabsTrigger value="traitements" className="gap-2">
              <Pill className="w-4 h-4" />
              Traitements
            </TabsTrigger>
            <TabsTrigger value="lentilles" className="gap-2">
              <Contact className="w-4 h-4" />
              Lentilles
            </TabsTrigger>
          </TabsList>

          <TabsContent value="actes" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Actes médicaux</h2>
              <Button onClick={() => setShowActeMedicalDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un acte
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Code</TableHead>
                    <TableHead>Libellé</TableHead>
                    <TableHead className="w-[150px]">Spécialité</TableHead>
                    <TableHead className="w-[120px] text-right">Tarif de base</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actesMedicaux.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucun acte médical enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    actesMedicaux.map((acte) => (
                      <TableRow key={acte.id}>
                        <TableCell className="font-medium">{acte.code}</TableCell>
                        <TableCell>{acte.libelle}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{acte.specialite}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{acte.tarif_base}€</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteActeMedicalMutation.mutate(acte.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="associations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Associations de cotation</h2>
              <Button onClick={() => setShowAssociationDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Créer une association
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Actes associés</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {associations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        Aucune association enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    associations.map((assoc) => (
                      <TableRow key={assoc.id}>
                        <TableCell className="font-medium">{assoc.nom}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {assoc.actes_ids?.map((acteId, idx) => {
                              const acte = actesMedicaux.find(a => a.id === acteId);
                              const depassement = assoc.depassements?.[idx] || 0;
                              return acte ? (
                                <div key={idx} className="text-sm">
                                  {acte.code} - {acte.libelle} <span className="font-semibold">({acte.tarif_base + depassement}€)</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAssociationMutation.mutate(assoc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="raccourcis" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Raccourcis d'examen</h2>
              <Button onClick={() => setShowRaccourciDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un raccourci
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nom</TableHead>
                    <TableHead className="w-[150px]">Catégorie</TableHead>
                    <TableHead>Texte</TableHead>
                    <TableHead className="w-[100px]">Portée</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {raccourcis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucun raccourci enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    raccourcis.map((raccourci) => (
                      <TableRow key={raccourci.id}>
                        <TableCell className="font-medium">{raccourci.nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{raccourci.categorie}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-md truncate">{raccourci.texte}</TableCell>
                        <TableCell>
                          {raccourci.is_global && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRaccourciMutation.mutate(raccourci.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="mega-raccourcis" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Méga Raccourcis Multi-Champs</h2>
                <p className="text-sm text-gray-500 mt-1">Remplissent automatiquement plusieurs champs à la fois</p>
              </div>
              <Button onClick={() => setShowMegaRaccourciDialog(true)} className="gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                <Plus className="w-4 h-4" />
                Créer un méga raccourci
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nom</TableHead>
                    <TableHead>Champs remplis</TableHead>
                    <TableHead className="w-[100px]">Portée</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {megaRaccourcis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Aucun méga raccourci enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    megaRaccourcis.map((raccourci) => {
                      const champsRemplis = [];
                      if (raccourci.lampe_fente_od || raccourci.lampe_fente_og) champsRemplis.push("Lampe à fente");
                      if (raccourci.fond_oeil_od || raccourci.fond_oeil_og) champsRemplis.push("Fond d'œil");
                      if (raccourci.interpretation_imagerie) champsRemplis.push("Imagerie");
                      if (raccourci.diagnostic || raccourci.conduite_tenir) champsRemplis.push("Conclusion");
                      
                      return (
                        <TableRow key={raccourci.id}>
                          <TableCell className="font-medium">{raccourci.nom}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {champsRemplis.map((champ, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {champ}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {raccourci.is_global && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                <Globe className="w-3 h-3 mr-1" />
                                Global
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMegaRaccourciMutation.mutate(raccourci.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="ordonnances" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Modèles d'ordonnances</h2>
              <Button onClick={() => setShowModeleOrdonnanceDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un modèle
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nom</TableHead>
                    <TableHead className="w-[150px]">Type</TableHead>
                    <TableHead>Contenu</TableHead>
                    <TableHead className="w-[100px]">Portée</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelesOrdonnances.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucun modèle enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    modelesOrdonnances.map((modele) => (
                      <TableRow key={modele.id}>
                        <TableCell className="font-medium">{modele.nom_modele}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{modele.type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-md truncate">{modele.contenu}</TableCell>
                        <TableCell>
                          {modele.is_global && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteModeleOrdonnanceMutation.mutate(modele.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="courriers" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Modèles de courriers</h2>
              <Button onClick={() => setShowModeleCourrierDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un modèle
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Nom</TableHead>
                    <TableHead className="w-[200px]">Objet</TableHead>
                    <TableHead>Contenu</TableHead>
                    <TableHead className="w-[100px]">Portée</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelesCourriers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucun modèle enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    modelesCourriers.map((modele) => (
                      <TableRow key={modele.id}>
                        <TableCell className="font-medium">{modele.nom_modele}</TableCell>
                        <TableCell className="text-sm text-gray-600">{modele.objet || "-"}</TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-md truncate">{modele.contenu}</TableCell>
                        <TableCell>
                          {modele.is_global && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteModeleCourrierMutation.mutate(modele.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="traitements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Traitements</h2>
              <Button onClick={() => setShowTraitementDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter un traitement
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Médicament</TableHead>
                    <TableHead>Posologie</TableHead>
                    <TableHead className="w-[200px]">Indication</TableHead>
                    <TableHead className="w-[100px]">Portée</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {traitements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        Aucun traitement enregistré
                      </TableCell>
                    </TableRow>
                  ) : (
                    traitements.map((traitement) => (
                      <TableRow key={traitement.id}>
                        <TableCell className="font-medium">{traitement.nom_medicament}</TableCell>
                        <TableCell className="text-sm">{traitement.posologie}</TableCell>
                        <TableCell className="text-sm text-gray-600">{traitement.indication || "-"}</TableCell>
                        <TableCell>
                          {traitement.is_global && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTraitementMutation.mutate(traitement.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="lentilles" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Lentilles de contact</h2>
              <Button onClick={() => setShowLentilleDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter une lentille
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Marque</TableHead>
                    <TableHead className="w-[150px]">Fabricant</TableHead>
                    <TableHead className="w-[150px]">Renouvellement</TableHead>
                    <TableHead className="w-[100px]">Rayon</TableHead>
                    <TableHead className="w-[100px]">Diamètre</TableHead>
                    <TableHead className="w-[100px]">Portée</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lentilles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Aucune lentille enregistrée
                      </TableCell>
                    </TableRow>
                  ) : (
                    lentilles.map((lentille) => (
                      <TableRow key={lentille.id}>
                        <TableCell className="font-medium">{lentille.marque}</TableCell>
                        <TableCell className="text-sm">{lentille.fabricant || "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{lentille.type_renouvellement}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{lentille.rayon ? `${lentille.rayon} mm` : "-"}</TableCell>
                        <TableCell className="text-sm">{lentille.diametre ? `${lentille.diametre} mm` : "-"}</TableCell>
                        <TableCell>
                          {lentille.is_global && (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteLentilleMutation.mutate(lentille.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog En-tête & Signature */}
        <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>En-tête, signature et template</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Ces informations seront utilisées pour vos documents d'impression.
                </p>
              </div>

              <div className="border-b pb-6">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <FileUp className="w-5 h-5" />
                  En-tête d'ordonnance (Image ou PDF)
                </Label>
                <p className="text-xs text-gray-500 mb-3">Uploadez une image ou un PDF qui sera affiché en haut de vos documents</p>
                
                {signatureData.entete_ordonnance && (
                  <div className="mb-3 p-4 bg-gray-50 rounded-lg border">
                    {signatureData.entete_ordonnance.toLowerCase().endsWith('.pdf') ? (
                      <div className="flex items-center gap-3">
                        <FileText className="w-8 h-8 text-red-600" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">PDF En-tête importé</p>
                          <a 
                            href={signatureData.entete_ordonnance} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Télécharger le PDF
                          </a>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSignatureData({ ...signatureData, entete_ordonnance: "" })}
                          className="text-red-600"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    ) : (
                      <>
                        <img 
                          src={signatureData.entete_ordonnance} 
                          alt="En-tête" 
                          className="max-h-48 object-contain w-full"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSignatureData({ ...signatureData, entete_ordonnance: "" })}
                          className="mt-2 text-red-600"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Supprimer
                        </Button>
                      </>
                    )}
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleUploadEnteteImage}
                    className="hidden"
                    id="entete-upload"
                    disabled={uploadingTemplate}
                  />
                  <Label
                    htmlFor="entete-upload"
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {uploadingTemplate ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choisir une image ou PDF
                      </>
                    )}
                  </Label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Formats acceptés : JPG, PNG, PDF
                </p>
              </div>

              <div className="border-t pt-6">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Image de signature
                </Label>
                <p className="text-xs text-gray-500 mb-3">Ajoutez une image de votre signature manuscrite</p>
                
                {signatureData.signature_image_url && (
                  <div className="mb-3 p-4 bg-gray-50 rounded-lg border">
                    <img 
                      src={signatureData.signature_image_url} 
                      alt="Signature" 
                      className="max-h-32 object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSignatureData({ ...signatureData, signature_image_url: "" })}
                      className="mt-2 text-red-600"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadSignatureImage}
                    className="hidden"
                    id="signature-upload"
                    disabled={uploadingSignature}
                  />
                  <Label
                    htmlFor="signature-upload"
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {uploadingSignature ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choisir une image
                      </>
                    )}
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowSignatureDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveSignature} 
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={uploadingSignature || uploadingTemplate}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Acte Medical */}
        <Dialog open={showActeMedicalDialog} onOpenChange={setShowActeMedicalDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un acte médical</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Code de l'acte</Label>
                <Input
                  value={newActeMedical.code}
                  onChange={(e) => setNewActeMedical({ ...newActeMedical, code: e.target.value })}
                  placeholder="Ex: BAQP003"
                />
              </div>
              <div>
                <Label>Libellé</Label>
                <Input
                  value={newActeMedical.libelle}
                  onChange={(e) => setNewActeMedical({ ...newActeMedical, libelle: e.target.value })}
                  placeholder="Description de l'acte"
                />
              </div>
              <div>
                <Label>Tarif de base (€)</Label>
                <Input
                  type="number"
                  value={newActeMedical.tarif_base}
                  onChange={(e) => setNewActeMedical({ ...newActeMedical, tarif_base: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Spécialité</Label>
                <Select
                  value={newActeMedical.specialite}
                  onValueChange={(value) => setNewActeMedical({ ...newActeMedical, specialite: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Orthoptie">Orthoptie</SelectItem>
                    <SelectItem value="Ophtalmologie">Ophtalmologie</SelectItem>
                    <SelectItem value="Commun">Commun</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowActeMedicalDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createActeMedicalMutation.mutate(newActeMedical)}
                  disabled={!newActeMedical.code || !newActeMedical.libelle}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Modele Ordonnance */}
        <Dialog open={showModeleOrdonnanceDialog} onOpenChange={setShowModeleOrdonnanceDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un modèle d'ordonnance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newModeleOrdonnance.is_global}
                    onChange={(e) => setNewModeleOrdonnance({ ...newModeleOrdonnance, is_global: e.target.checked })}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Modèle global (visible par tous)
                </Label>
              </div>
              <div>
                <Label>Nom du modèle</Label>
                <Input
                  value={newModeleOrdonnance.nom_modele}
                  onChange={(e) => setNewModeleOrdonnance({ ...newModeleOrdonnance, nom_modele: e.target.value })}
                  placeholder="Ex: Myopie standard"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newModeleOrdonnance.type}
                  onValueChange={(value) => setNewModeleOrdonnance({ ...newModeleOrdonnance, type: value })}
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
                <Label>Contenu</Label>
                <Textarea
                  value={newModeleOrdonnance.contenu}
                  onChange={(e) => setNewModeleOrdonnance({ ...newModeleOrdonnance, contenu: e.target.value })}
                  rows={12}
                  className="font-mono"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowModeleOrdonnanceDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createModeleOrdonnanceMutation.mutate(newModeleOrdonnance)}
                  disabled={!newModeleOrdonnance.nom_modele || !newModeleOrdonnance.contenu}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Modele Courrier */}
        <Dialog open={showModeleCourrierDialog} onOpenChange={setShowModeleCourrierDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un modèle de courrier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newModeleCourrier.is_global}
                    onChange={(e) => setNewModeleCourrier({ ...newModeleCourrier, is_global: e.target.checked })}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Modèle global (visible par tous)
                </Label>
              </div>
              <div>
                <Label>Nom du modèle</Label>
                <Input
                  value={newModeleCourrier.nom_modele}
                  onChange={(e) => setNewModeleCourrier({ ...newModeleCourrier, nom_modele: e.target.value })}
                  placeholder="Ex: Courrier médecin traitant"
                />
              </div>
              <div>
                <Label>Objet</Label>
                <Input
                  value={newModeleCourrier.objet}
                  onChange={(e) => setNewModeleCourrier({ ...newModeleCourrier, objet: e.target.value })}
                  placeholder="Objet du courrier"
                />
              </div>
              <div>
                <Label>Contenu</Label>
                <Textarea
                  value={newModeleCourrier.contenu}
                  onChange={(e) => setNewModeleCourrier({ ...newModeleCourrier, contenu: e.target.value })}
                  rows={12}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowModeleCourrierDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createModeleCourrierMutation.mutate(newModeleCourrier)}
                  disabled={!newModeleCourrier.nom_modele || !newModeleCourrier.contenu}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Association */}
        <Dialog open={showAssociationDialog} onOpenChange={setShowAssociationDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Créer une association de cotation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom de l'association</Label>
                <Input
                  value={newAssociation.nom}
                  onChange={(e) => setNewAssociation({ ...newAssociation, nom: e.target.value })}
                  placeholder="Ex: Consultation complète + Tonométrie"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Actes associés</Label>
                  <Button size="sm" onClick={ajouterActeAssociation} variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un acte
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {newAssociation.actes.map((acte, index) => (
                    <Card key={index} className="p-4">
                      <div className="grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-7">
                          <Select
                            value={acte.acte_id}
                            onValueChange={(value) => modifierActeAssociation(index, 'acte_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un acte" />
                            </SelectTrigger>
                            <SelectContent>
                              {actesMedicaux.map((am) => (
                                <SelectItem key={am.id} value={am.id}>
                                  {am.code} - {am.libelle} ({am.tarif_base}€)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-4">
                          <Input
                            type="number"
                            placeholder="Dépassement"
                            value={acte.depassement}
                            onChange={(e) => modifierActeAssociation(index, 'depassement', e.target.value)}
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retirerActeAssociation(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAssociationDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={sauvegarderAssociation}
                  disabled={!newAssociation.nom || newAssociation.actes.length === 0}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Traitement */}
        <Dialog open={showTraitementDialog} onOpenChange={setShowTraitementDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un traitement</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newTraitement.is_global}
                    onChange={(e) => setNewTraitement({ ...newTraitement, is_global: e.target.checked })}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Traitement global (visible par tous)
                </Label>
              </div>
              <div>
                <Label>Nom du médicament *</Label>
                <Input
                  value={newTraitement.nom_medicament}
                  onChange={(e) => setNewTraitement({ ...newTraitement, nom_medicament: e.target.value })}
                  placeholder="Ex: Atropine 0.5%"
                />
              </div>
              <div>
                <Label>Posologie *</Label>
                <Textarea
                  value={newTraitement.posologie}
                  onChange={(e) => setNewTraitement({ ...newTraitement, posologie: e.target.value })}
                  placeholder="Ex: 1 goutte matin et soir dans l'œil droit"
                  rows={3}
                />
              </div>
              <div>
                <Label>Indication thérapeutique</Label>
                <Input
                  value={newTraitement.indication}
                  onChange={(e) => setNewTraitement({ ...newTraitement, indication: e.target.value })}
                  placeholder="Ex: Traitement de l'amblyopie"
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowTraitementDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createTraitementMutation.mutate(newTraitement)}
                  disabled={!newTraitement.nom_medicament || !newTraitement.posologie}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Lentille */}
        <Dialog open={showLentilleDialog} onOpenChange={setShowLentilleDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter une lentille de contact</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newLentille.is_global}
                    onChange={(e) => setNewLentille({ ...newLentille, is_global: e.target.checked })}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Lentille globale (visible par tous)
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Marque *</Label>
                  <Input
                    value={newLentille.marque}
                    onChange={(e) => setNewLentille({ ...newLentille, marque: e.target.value })}
                    placeholder="Ex: Acuvue Oasys"
                  />
                </div>
                <div>
                  <Label>Fabricant</Label>
                  <Input
                    value={newLentille.fabricant}
                    onChange={(e) => setNewLentille({ ...newLentille, fabricant: e.target.value })}
                    placeholder="Ex: Johnson & Johnson"
                  />
                </div>
              </div>
              <div>
                <Label>Type de renouvellement *</Label>
                <Select
                  value={newLentille.type_renouvellement}
                  onValueChange={(value) => setNewLentille({ ...newLentille, type_renouvellement: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Journalière">Journalière</SelectItem>
                    <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="Bimensuelle">Bimensuelle</SelectItem>
                    <SelectItem value="Mensuelle">Mensuelle</SelectItem>
                    <SelectItem value="Trimestrielle">Trimestrielle</SelectItem>
                    <SelectItem value="Annuelle">Annuelle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Rayon (mm)</Label>
                  <Input
                    value={newLentille.rayon}
                    onChange={(e) => setNewLentille({ ...newLentille, rayon: e.target.value })}
                    placeholder="Ex: 8.4"
                  />
                </div>
                <div>
                  <Label>Diamètre (mm)</Label>
                  <Input
                    value={newLentille.diametre}
                    onChange={(e) => setNewLentille({ ...newLentille, diametre: e.target.value })}
                    placeholder="Ex: 14.0"
                  />
                </div>
              </div>
              <div>
                <Label>Texte à imprimer sur l'ordonnance</Label>
                <Textarea
                  value={newLentille.texte_impression}
                  onChange={(e) => setNewLentille({ ...newLentille, texte_impression: e.target.value })}
                  rows={4}
                  placeholder="Instructions particulières, conseils d'entretien, etc..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ce texte sera affiché automatiquement sur les ordonnances prescrivant cette lentille
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowLentilleDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createLentilleMutation.mutate(newLentille)}
                  disabled={!newLentille.marque || !newLentille.type_renouvellement}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Raccourci */}
        <Dialog open={showRaccourciDialog} onOpenChange={setShowRaccourciDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un raccourci d'examen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newRaccourci.is_global}
                    onChange={(e) => setNewRaccourci({ ...newRaccourci, is_global: e.target.checked })}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Raccourci global (visible par tous)
                </Label>
              </div>
              <div>
                <Label>Nom du raccourci *</Label>
                <Input
                  value={newRaccourci.nom}
                  onChange={(e) => setNewRaccourci({ ...newRaccourci, nom: e.target.value })}
                  placeholder="Ex: RAS"
                />
              </div>
              <div>
                <Label>Catégorie *</Label>
                <Select
                  value={newRaccourci.categorie}
                  onValueChange={(value) => setNewRaccourci({ ...newRaccourci, categorie: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lampe_fente">Lampe à fente</SelectItem>
                    <SelectItem value="fond_oeil">Fond d'œil</SelectItem>
                    <SelectItem value="motilite">Motilité</SelectItem>
                    <SelectItem value="motif_consultation">Motif de consultation</SelectItem>
                    <SelectItem value="allergie">Allergie</SelectItem>
                    <SelectItem value="atcd_med">ATCD Médicaux</SelectItem>
                    <SelectItem value="atcd_oph">ATCD Ophtalmologiques</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Texte à insérer *</Label>
                <Textarea
                  value={newRaccourci.texte}
                  onChange={(e) => setNewRaccourci({ ...newRaccourci, texte: e.target.value })}
                  rows={4}
                  placeholder="Texte qui sera inséré automatiquement"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-gray-600">
                  Ce raccourci apparaîtra comme un bouton au-dessus des champs de texte correspondants. Cliquer dessus remplira automatiquement le champ.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRaccourciDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createRaccourciMutation.mutate(newRaccourci)}
                  disabled={!newRaccourci.nom || !newRaccourci.texte}
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog Méga Raccourci */}
        <Dialog open={showMegaRaccourciDialog} onOpenChange={setShowMegaRaccourciDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Créer un méga raccourci multi-champs
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Méga raccourci :</strong> Remplissez les champs que vous souhaitez. Quand vous cliquerez sur ce raccourci, tous les champs définis seront automatiquement remplis en même temps.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={newMegaRaccourci.is_global}
                    onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, is_global: e.target.checked })}
                    className="rounded"
                  />
                  <Globe className="w-4 h-4" />
                  Méga raccourci global (visible par tous)
                </Label>
              </div>

              <div>
                <Label className="text-base font-semibold">Nom du méga raccourci *</Label>
                <Input
                  value={newMegaRaccourci.nom}
                  onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, nom: e.target.value })}
                  placeholder="Ex: Examen normal, Myopie simple, Glaucome suivi..."
                  className="mt-2"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-600" />
                  Lampe à fente
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">OD (Œil Droit)</Label>
                    <Textarea
                      value={newMegaRaccourci.lampe_fente_od}
                      onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, lampe_fente_od: e.target.value })}
                      rows={3}
                      placeholder="Laisser vide si non utilisé"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">OG (Œil Gauche)</Label>
                    <Textarea
                      value={newMegaRaccourci.lampe_fente_og}
                      onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, lampe_fente_og: e.target.value })}
                      rows={3}
                      placeholder="Laisser vide si non utilisé"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-red-600" />
                  Fond d'œil
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">OD (Œil Droit)</Label>
                    <Textarea
                      value={newMegaRaccourci.fond_oeil_od}
                      onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, fond_oeil_od: e.target.value })}
                      rows={3}
                      placeholder="Laisser vide si non utilisé"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">OG (Œil Gauche)</Label>
                    <Textarea
                      value={newMegaRaccourci.fond_oeil_og}
                      onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, fond_oeil_og: e.target.value })}
                      rows={3}
                      placeholder="Laisser vide si non utilisé"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-indigo-600" />
                  Interprétation d'imagerie
                </h3>
                <Textarea
                  value={newMegaRaccourci.interpretation_imagerie}
                  onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, interpretation_imagerie: e.target.value })}
                  rows={4}
                  placeholder="Laisser vide si non utilisé"
                  className="text-sm"
                />
              </div>

              <div className="border-t pt-6">
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Conclusion
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Diagnostic</Label>
                    <Textarea
                      value={newMegaRaccourci.diagnostic}
                      onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, diagnostic: e.target.value })}
                      rows={3}
                      placeholder="Laisser vide si non utilisé"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Conduite à tenir</Label>
                    <Textarea
                      value={newMegaRaccourci.conduite_tenir}
                      onChange={(e) => setNewMegaRaccourci({ ...newMegaRaccourci, conduite_tenir: e.target.value })}
                      rows={3}
                      placeholder="Laisser vide si non utilisé"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowMegaRaccourciDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={() => createMegaRaccourciMutation.mutate(newMegaRaccourci)}
                  disabled={!newMegaRaccourci.nom}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Créer le méga raccourci
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showNomAffichageDialog} onOpenChange={setShowNomAffichageDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Mon nom d'affichage</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nom qui apparaîtra sur vos examens</Label>
                <Input
                  value={nomAffichageTemp}
                  onChange={(e) => setNomAffichageTemp(e.target.value)}
                  placeholder="Ex: Dr Dupont ou Initiales A.D."
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-2">
                  {currentUser?.specialite === 'orthoptiste' 
                    ? "Pour les orthoptistes, il est recommandé d'utiliser vos initiales (ex: A.D.)"
                    : "Pour les ophtalmologues, le nom complet sera affiché (ex: Dr Dupont)"}
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-gray-700">
                  <strong>Nom actuel:</strong> {currentUser?.nom_affichage || currentUser?.full_name || "Non défini"}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowNomAffichageDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveNomAffichage}
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!nomAffichageTemp}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showMessageEmailDialog} onOpenChange={setShowMessageEmailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Message pour les emails avec PDF</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Message personnalisé</Label>
                <Textarea
                  value={messageEmailTemp}
                  onChange={(e) => setMessageEmailTemp(e.target.value)}
                  placeholder="Bonjour,&#10;&#10;Vous trouverez ci-joint votre document médical.&#10;&#10;Cordialement,"
                  rows={8}
                  className="mt-2 font-sans"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Ce message apparaîtra dans tous les emails envoyés avec un PDF (ordonnances, courriers, factures, etc.)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-xs text-gray-700">
                  <strong>Aperçu:</strong>
                </p>
                <div className="mt-2 p-3 bg-white rounded border text-sm whitespace-pre-wrap">
                  {messageEmailTemp || "Aucun message défini"}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowMessageEmailDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveMessageEmail}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
