
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
import { Plus, Printer, Trash2, Eye, Search, Clock, Mail } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { genererPdfEtOuvrirEmail } from "./PdfEmailHelper";

export default function TraitementsSection({ patientId, patient }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedOrdonnance, setSelectedOrdonnance] = useState(null); // This state is no longer used for email dialog, but kept for potential future use or if other logic depends on it.
  const [oeilSelectionne, setOeilSelectionne] = useState("Les deux yeux");
  const [searchTerm, setSearchTerm] = useState("");
  const [dureeTraitement, setDureeTraitement] = useState("");
  const [formData, setFormData] = useState({
    patient_id: patientId,
    date_ordonnance: new Date().toISOString(),
    type_ordonnance: "Medicaments",
    contenu: "",
    modele_utilise: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null); // Added .catch(() => null)
      setCurrentUser(user || { email: 'default@user.com', specialite: 'ophtalmologue' }); // Set default user with specialite
    };
    loadUser();
  }, []);

  // Permission logic:
  // - Only ophtalmologue and admin can create/modify ordonnances de traitement
  // - Everyone can print/email ordonnances de traitement
  const canCreate = currentUser?.specialite === 'ophtalmologue' || 
                    currentUser?.specialite === 'admin';
  const canPrintOrEmail = true; // Everyone can print/email

  const { data: ordonnances, isLoading } = useQuery({
    queryKey: ['ordonnances-medicaments', patientId],
    queryFn: async () => {
      const allOrdonnances = await base44.entities.Ordonnance.list('-date_ordonnance');
      return allOrdonnances.filter(o => o.patient_id === patientId && o.type_ordonnance === "Medicaments");
    },
    initialData: [],
  });

  const { data: traitements } = useQuery({
    queryKey: ['traitements'],
    queryFn: () => base44.entities.Traitement.list(),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-print'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: modeles } = useQuery({
    queryKey: ['modeles-ordonnance-medicaments'],
    queryFn: async () => {
      const allModeles = await base44.entities.ModeleOrdonnance.list();
      return allModeles.filter(m => m.type === "Medicaments");
    },
    initialData: [],
  });

  const createOrdonnanceMutation = useMutation({
    mutationFn: (data) => base44.entities.Ordonnance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordonnances-medicaments', patientId] });
      setShowDialog(false);
      setFormData({
        patient_id: patientId,
        date_ordonnance: new Date().toISOString(),
        type_ordonnance: "Medicaments",
        contenu: "",
        modele_utilise: ""
      });
    },
  });

  const deleteOrdonnanceMutation = useMutation({
    mutationFn: (id) => base44.entities.Ordonnance.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordonnances-medicaments', patientId] });
    },
  });

  const handleModeleChange = (modeleId) => {
    const modele = modeles.find(m => m.id === modeleId);
    if (modele) {
      setFormData({
        ...formData,
        contenu: modele.contenu,
        modele_utilise: modele.nom_modele
      });
    }
  };

  const handleTraitementClick = (traitement) => {
    // Détecter si c'est un collyre (contient "goutte" dans la posologie ou "Traitement du glaucome" dans l'indication)
    const estCollyre = traitement.posologie?.toLowerCase().includes('goutte') || 
                       traitement.indication?.toLowerCase().includes('glaucome') ||
                       traitement.indication?.toLowerCase().includes('collyre');
    
    let texteTraitement = `${traitement.nom_medicament}\n`;
    
    if (estCollyre && oeilSelectionne !== "Les deux yeux") {
      // Ajouter l'œil spécifié pour les collyres
      texteTraitement += `${traitement.posologie} dans l'${oeilSelectionne}`;
    } else if (estCollyre && oeilSelectionne === "Les deux yeux") {
      texteTraitement += `${traitement.posologie} dans les deux yeux`;
    } else {
      texteTraitement += traitement.posologie;
    }
    
    // Ajouter la durée si elle est définie dans le traitement ou sélectionnée
    const duree = dureeTraitement || traitement.duree;
    if (duree) {
      texteTraitement += `\nDurée: ${duree}`;
    }
    
    if (traitement.indication) {
      texteTraitement += `\nIndication: ${traitement.indication}`;
    }
    
    setFormData({
      ...formData,
      contenu: formData.contenu ? `${formData.contenu}\n\n${texteTraitement}` : texteTraitement
    });
  };

  const genererHtmlOrdonnance = (ordonnance) => {
    const medecin = users.find(u => u.specialite === 'admin' || u.specialite === 'ophtalmologue') || currentUser;
    const entete = medecin?.entete_ordonnance || '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ordonnance - ${patient.prenom} ${patient.nom}</title>
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
        
        <div class="title">Ordonnance de médicaments</div>
        
        <div class="patient-info">
          <p><strong>Patient(e) :</strong> ${patient.prenom} ${patient.nom}</p>
          ${patient.date_naissance ? `<p><strong>Date de naissance :</strong> ${format(new Date(patient.date_naissance), 'dd/MM/yyyy')}</p>` : ''}
          <p><strong>Date :</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
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

  const handleSaveAndPrint = async () => {
    const nouvelleOrdonnance = await createOrdonnanceMutation.mutateAsync(formData);
    setTimeout(() => {
      imprimerOrdonnance(nouvelleOrdonnance);
    }, 300);
  };

  const imprimerOrdonnance = (ordonnance) => {
    const htmlContentBase = genererHtmlOrdonnance(ordonnance);
    const htmlContentForPrint = htmlContentBase.replace('<body>', '<body onload="window.print(); window.close();">');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContentForPrint);
    printWindow.document.close();
  };

  const handleDelete = (ordonnance) => {
    if (!canCreate) return;
    
    const dateOrdonnance = new Date(ordonnance.date_ordonnance);
    const maintenant = new Date();
    const differenceHeures = (maintenant - dateOrdonnance) / (1000 * 60 * 60);
    
    if (differenceHeures > 24) {
      toast.error("Impossible de supprimer une ordonnance de plus de 24 heures");
      return;
    }
    
    if (confirm('Voulez-vous vraiment supprimer cette ordonnance ?')) {
      deleteOrdonnanceMutation.mutate(ordonnance.id);
    }
  };

  const handleEnvoyerEmail = async (ordonnance) => {
    if (!patient.email) {
      toast.error("Le patient n'a pas d'adresse email renseignée");
      return;
    }
    
    const user = await base44.auth.me();
    const messagePersonnalise = user?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre ordonnance de médicaments.\n\nCordialement,";
    
    const htmlContent = genererHtmlOrdonnance(ordonnance);
    const sujet = `Ordonnance de médicaments`;
    const nomFichier = `Ordonnance_Medicaments_${patient.nom}_${patient.prenom}_${format(new Date(), 'yyyyMMdd')}`;
    
    await genererPdfEtOuvrirEmail(htmlContent, patient.email, sujet, nomFichier, messagePersonnalise);
  };

  // Filtrer les traitements selon le terme de recherche
  const traitementsFiltered = traitements.filter(traitement => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      traitement.nom_medicament?.toLowerCase().includes(searchLower) ||
      traitement.posologie?.toLowerCase().includes(searchLower) ||
      traitement.indication?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Traitements</h2>
        {canCreate && (
          <Button
            onClick={() => setShowDialog(true)}
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
              Aucune ordonnance de médicaments enregistrée
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
                      <CardTitle className="text-lg">Ordonnance de médicaments</CardTitle>
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
                            className="gap-2"
                            onClick={() => imprimerOrdonnance(ordonnance)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEnvoyerEmail(ordonnance)}
                            disabled={!patient.email}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {canCreate && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(ordonnance)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={!peutSupprimer}
                          title={peutSupprimer ? "Supprimer" : "Suppression impossible après 24h"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle ordonnance de médicaments</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-4">
              <div>
                <Label>Modèle prérempli (optionnel)</Label>
                <Select onValueChange={handleModeleChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    {modeles.map(modele => (
                      <SelectItem key={modele.id} value={modele.id}>
                        {modele.nom_modele}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Contenu de l'ordonnance</Label>
                <Textarea
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  rows={20}
                  className="font-mono"
                  placeholder="Prescrivez les médicaments..."
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Annuler
                </Button>
                <Button 
                  onClick={handleSaveAndPrint}
                  disabled={!formData.contenu}
                  className="bg-purple-600 hover:bg-purple-700 gap-2"
                >
                  <Printer className="w-4 h-4" />
                  Enregistrer et imprimer
                </Button>
              </div>
            </div>

            <div className="border-l pl-4">
              <div className="mb-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Sélection de l'œil (collyres)
                </h3>
                <Select value={oeilSelectionne} onValueChange={setOeilSelectionne}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Les deux yeux">Les deux yeux</SelectItem>
                    <SelectItem value="OD">OD (Œil Droit)</SelectItem>
                    <SelectItem value="OG">OG (Œil Gauche)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Durée du traitement
                </h3>
                <Select value={dureeTraitement} onValueChange={setDureeTraitement}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner une durée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucune (ou celle du traitement)</SelectItem>
                    <SelectItem value="7 jours">7 jours</SelectItem>
                    <SelectItem value="15 jours">15 jours</SelectItem>
                    <SelectItem value="1 mois">1 mois</SelectItem>
                    <SelectItem value="2 mois">2 mois</SelectItem>
                    <SelectItem value="3 mois">3 mois</SelectItem>
                    <SelectItem value="6 mois">6 mois</SelectItem>
                    <SelectItem value="En continu">En continu</SelectItem>
                    <SelectItem value="À vie">À vie</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-2">
                  Cette durée sera ajoutée lors du clic sur un traitement
                </p>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-3">Rechercher un médicament</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Nom, posologie, indication..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {searchTerm && (
                  <p className="text-xs text-gray-500 mt-2">
                    {traitementsFiltered.length} résultat(s) trouvé(s)
                  </p>
                )}
              </div>

              <h3 className="font-semibold mb-3">Traitements fréquents</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {traitementsFiltered.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Aucun traitement trouvé
                  </p>
                ) : (
                  traitementsFiltered.map(traitement => {
                    const estCollyre = traitement.posologie?.toLowerCase().includes('goutte') || 
                                      traitement.indication?.toLowerCase().includes('glaucome');
                    
                    return (
                      <Card 
                        key={traitement.id} 
                        className="cursor-pointer hover:bg-blue-50 transition-colors"
                        onClick={() => handleTraitementClick(traitement)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{traitement.nom_medicament}</p>
                              <p className="text-xs text-gray-600 mt-1">{traitement.posologie}</p>
                              {traitement.duree && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {traitement.duree}
                                </p>
                              )}
                              {traitement.indication && (
                                <p className="text-xs text-gray-500 mt-1 italic">{traitement.indication}</p>
                              )}
                            </div>
                            {estCollyre && (
                              <Eye className="w-4 h-4 text-blue-500 flex-shrink-0" title="Collyre" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
