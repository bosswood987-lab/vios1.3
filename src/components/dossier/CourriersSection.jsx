
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
import { Plus, Save, Mail, Printer, CheckCircle, Info, Trash2 } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { genererPdfEtOuvrirEmail } from "./PdfEmailHelper";

export default function CourriersSection({ patientId, patient }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    patient_id: patientId,
    date_courrier: new Date().toISOString(),
    contenu: "",
    modele_utilise: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { email: 'default@user.com', specialite: 'ophtalmologue' });
    };
    loadUser();
  }, []);

  // Permission logic:
  // - Only ophtalmologue and admin can create/modify courriers
  // - Everyone can print/email courriers
  const canCreate = currentUser?.specialite === 'ophtalmologue' || 
                    currentUser?.specialite === 'admin';
  const canPrintOrEmail = true; // Everyone can print/email

  const { data: courriers, isLoading } = useQuery({
    queryKey: ['courriers', patientId],
    queryFn: async () => {
      const allCourriers = await base44.entities.Courrier.list('-date_courrier');
      return allCourriers.filter(c => c.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: modeles } = useQuery({
    queryKey: ['modeles-courrier'],
    queryFn: () => base44.entities.ModeleCourrier.list(),
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-print'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: examensOrthoptiste } = useQuery({
    queryKey: ['examens-orthoptiste-for-courrier', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOrthoptiste.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: examensOphtalmologie } = useQuery({
    queryKey: ['examens-ophtalmologie-for-courrier', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOphtalmologie.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: conclusions } = useQuery({
    queryKey: ['conclusions-for-courrier', patientId],
    queryFn: async () => {
      const allConclusions = await base44.entities.Conclusion.list('-date_conclusion');
      return allConclusions.filter(c => c.patient_id === patientId);
    },
    initialData: [],
  });

  const createCourrierMutation = useMutation({
    mutationFn: (data) => base44.entities.Courrier.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courriers', patientId] });
    },
  });

  const deleteCourrierMutation = useMutation({
    mutationFn: (id) => base44.entities.Courrier.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courriers', patientId] });
      toast.success("Courrier supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du courrier");
    }
  });

  const updatePatientStatutMutation = useMutation({
    mutationFn: (statut) => base44.entities.Patient.update(patientId, { statut_salle_attente: statut }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-salle-attente'] });
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
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
        contenu: modele.contenu,
        modele_utilise: modele.nom_modele
      });
    }
  };

  // Fonction pour remplacer les placeholders
  const remplacerPlaceholders = (texte) => {
    let contenuFinal = texte;

    // Remplacer #PATIENT par M/Mme Nom Prénom
    if (contenuFinal.includes('#PATIENT')) {
      const civilite = patient.genre === 'Femme' ? 'Mme' : patient.genre === 'Homme' ? 'M' : '';
      const patientTexte = `${civilite} ${patient.nom} ${patient.prenom}`;
      contenuFinal = contenuFinal.replace(/#PATIENT/g, patientTexte);
    }

    // Remplacer #AV par l'acuité visuelle de loin
    if (contenuFinal.includes('#AV')) {
      let avTexte = '';
      
      if (examensOrthoptiste.length > 0) {
        const dernierExamen = examensOrthoptiste[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(dernierExamen.date_examen), aujourdhui)) {
          if (dernierExamen.ref_subjective_od_avl || dernierExamen.ref_subjective_og_avl) {
            avTexte = 'Acuité visuelle de loin :\n';
            if (dernierExamen.ref_subjective_od_avl) avTexte += `OD : ${dernierExamen.ref_subjective_od_avl}\n`;
            if (dernierExamen.ref_subjective_og_avl) avTexte += `OG : ${dernierExamen.ref_subjective_og_avl}`;
          } else {
            avTexte = '[Pas d\'acuité visuelle de loin enregistrée aujourd\'hui]';
          }
        } else {
          avTexte = '[Pas d\'acuité visuelle de loin enregistrée aujourd\'hui]';
        }
      } else {
        avTexte = '[Pas d\'acuité visuelle de loin enregistrée]';
      }
      
      contenuFinal = contenuFinal.replace(/#AV/g, avTexte);
    }

    // Remplacer #AVP par l'acuité visuelle de près
    if (contenuFinal.includes('#AVP')) {
      let avpTexte = '';
      
      if (examensOrthoptiste.length > 0) {
        const dernierExamen = examensOrthoptiste[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(dernierExamen.date_examen), aujourdhui)) {
          if (dernierExamen.ref_subjective_od_avp || dernierExamen.ref_subjective_og_avp) {
            avpTexte = 'Acuité visuelle de près :\n';
            if (dernierExamen.ref_subjective_od_avp) avpTexte += `OD : ${dernierExamen.ref_subjective_od_avp}\n`;
            if (dernierExamen.ref_subjective_og_avp) avpTexte += `OG : ${dernierExamen.ref_subjective_og_avp}`;
          } else {
            avpTexte = '[Pas d\'acuité visuelle de près enregistrée aujourd\'hui]';
          }
        } else {
          avpTexte = '[Pas d\'acuité visuelle de près enregistrée aujourd\'hui]';
        }
      } else {
        avpTexte = '[Pas d\'acuité visuelle de près enregistrée]';
      }
      
      contenuFinal = contenuFinal.replace(/#AVP/g, avpTexte);
    }

    // Remplacer #PIO par la PIO corrigée
    if (contenuFinal.includes('#PIO')) {
      let pioTexte = '';
      
      if (examensOrthoptiste.length > 0) {
        const dernierExamen = examensOrthoptiste[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(dernierExamen.date_examen), aujourdhui)) {
          if (dernierExamen.pio_corrige_od || dernierExamen.pio_corrige_og) {
            pioTexte = 'PIO corrigée :\n';
            if (dernierExamen.pio_corrige_od) pioTexte += `OD : ${dernierExamen.pio_corrige_od} mmHg\n`;
            if (dernierExamen.pio_corrige_og) pioTexte += `OG : ${dernierExamen.pio_corrige_og} mmHg`;
          } else {
            pioTexte = '[Pas de PIO corrigée enregistrée aujourd\'hui]';
          }
        } else {
          pioTexte = '[Pas de PIO corrigée enregistrée aujourd\'hui]';
        }
      } else {
        pioTexte = '[Pas de PIO corrigée enregistrée]';
      }
      
      contenuFinal = contenuFinal.replace(/#PIO/g, pioTexte);
    }

    // Remplacer #REF par la réfraction subjective du jour
    if (contenuFinal.includes('#REF')) {
      let refractionTexte = '';
      
      if (examensOrthoptiste.length > 0) {
        const dernierExamen = examensOrthoptiste[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(dernierExamen.date_examen), aujourdhui)) {
          refractionTexte = 'Réfraction subjective du jour :\n\n';
          
          if (dernierExamen.ref_subjective_od_sphere || dernierExamen.ref_subjective_og_sphere) {
            refractionTexte += 'OD : ';
            if (dernierExamen.ref_subjective_od_sphere) refractionTexte += `Sphère ${dernierExamen.ref_subjective_od_sphere} `;
            if (dernierExamen.ref_subjective_od_cylindre) refractionTexte += `Cylindre ${dernierExamen.ref_subjective_od_cylindre} `;
            if (dernierExamen.ref_subjective_od_axe) refractionTexte += `Axe ${dernierExamen.ref_subjective_od_axe}° `;
            if (dernierExamen.ref_subjective_od_avl) refractionTexte += `AVL ${dernierExamen.ref_subjective_od_avl} `;
            if (dernierExamen.ref_subjective_od_add) refractionTexte += `Addition ${dernierExamen.ref_subjective_od_add} `;
            if (dernierExamen.ref_subjective_od_avp) refractionTexte += `AVP ${dernierExamen.ref_subjective_od_avp}`;
            refractionTexte += '\n';
            
            refractionTexte += 'OG : ';
            if (dernierExamen.ref_subjective_og_sphere) refractionTexte += `Sphère ${dernierExamen.ref_subjective_og_sphere} `;
            if (dernierExamen.ref_subjective_og_cylindre) refractionTexte += `Cylindre ${dernierExamen.ref_subjective_og_cylindre} `;
            if (dernierExamen.ref_subjective_og_axe) refractionTexte += `Axe ${dernierExamen.ref_subjective_og_axe}° `;
            if (dernierExamen.ref_subjective_og_avl) refractionTexte += `AVL ${dernierExamen.ref_subjective_og_avl} `;
            if (dernierExamen.ref_subjective_og_add) refractionTexte += `Addition ${dernierExamen.ref_subjective_og_add} `;
            if (dernierExamen.ref_subjective_og_avp) refractionTexte += `AVP ${dernierExamen.ref_subjective_og_avp}`;
          } else {
            refractionTexte = '[Pas de réfraction subjective enregistrée aujourd\'hui]';
          }
        } else {
          refractionTexte = '[Pas de réfraction subjective enregistrée aujourd\'hui]';
        }
      } else {
        refractionTexte = '[Pas de réfraction subjective enregistrée]';
      }
      
      contenuFinal = contenuFinal.replace(/#REF/g, refractionTexte);
    }

    // Remplacer #LAF par la lampe à fente du jour
    if (contenuFinal.includes('#LAF')) {
      let lampeTexte = '';
      
      if (examensOphtalmologie.length > 0) {
        const dernierExamen = examensOphtalmologie[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(dernierExamen.date_examen), aujourdhui)) {
          lampeTexte = 'Examen à la lampe à fente du jour :\n\n';
          
          if (dernierExamen.lampe_fente_od || dernierExamen.lampe_fente_og) {
            if (dernierExamen.lampe_fente_od) {
              lampeTexte += `OD : ${dernierExamen.lampe_fente_od}\n`;
            }
            if (dernierExamen.lampe_fente_og) {
              lampeTexte += `OG : ${dernierExamen.lampe_fente_og}`;
            }
          } else {
            lampeTexte = '[Pas d\'examen à la lampe à fente enregistré aujourd\'hui]';
          }
        } else {
          lampeTexte = '[Pas d\'examen à la lampe à fente enregistré aujourd\'hui]';
        }
      } else {
        lampeTexte = '[Pas d\'examen à la lampe à fente enregistré]';
      }
      
      contenuFinal = contenuFinal.replace(/#LAF/g, lampeTexte);
    }

    // Remplacer #FO par le fond d'œil du jour
    if (contenuFinal.includes('#FO')) {
      let fondOeilTexte = '';
      
      if (examensOphtalmologie.length > 0) {
        const dernierExamen = examensOphtalmologie[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(dernierExamen.date_examen), aujourdhui)) {
          fondOeilTexte = 'Fond d\'œil du jour :\n\n';
          
          if (dernierExamen.fond_oeil_od || dernierExamen.fond_oeil_og) {
            if (dernierExamen.fond_oeil_od) {
              fondOeilTexte += `OD : ${dernierExamen.fond_oeil_od}\n`;
            }
            if (dernierExamen.fond_oeil_og) {
              fondOeilTexte += `OG : ${dernierExamen.fond_oeil_og}`;
            }
          } else {
            fondOeilTexte = '[Pas d\'examen du fond d\'œil enregistré aujourd\'hui]';
          }
        } else {
          fondOeilTexte = '[Pas d\'examen du fond d\'œil enregistré aujourd\'hui]';
        }
      } else {
        fondOeilTexte = '[Pas d\'examen du fond d\'œil enregistré]';
      }
      
      contenuFinal = contenuFinal.replace(/#FO/g, fondOeilTexte);
    }

    // Remplacer #CON par la conclusion du jour
    if (contenuFinal.includes('#CON')) {
      let conclusionTexte = '';
      
      if (conclusions.length > 0) {
        const derniereConclusion = conclusions[0];
        const aujourdhui = new Date();
        
        if (isSameDay(new Date(derniereConclusion.date_conclusion), aujourdhui)) {
          conclusionTexte = 'Conclusion du jour :\n\n';
          
          if (derniereConclusion.diagnostic) {
            conclusionTexte += `Diagnostic : ${derniereConclusion.diagnostic}\n\n`;
          }
          if (derniereConclusion.conduite_tenir) {
            conclusionTexte += `Conduite à tenir : ${derniereConclusion.conduite_tenir}`;
          }
          if (derniereConclusion.notes) {
            conclusionTexte += `\n\nNotes : ${derniereConclusion.notes}`;
          }
          
          if (!derniereConclusion.diagnostic && !derniereConclusion.conduite_tenir && !derniereConclusion.notes) {
            conclusionTexte = '[Pas de conclusion enregistrée aujourd\'hui]';
          }
        } else {
          conclusionTexte = '[Pas de conclusion enregistrée aujourd\'hui]';
        }
      } else {
        conclusionTexte = '[Pas de conclusion enregistrée]';
      }
      
      contenuFinal = contenuFinal.replace(/#CON/g, conclusionTexte);
    }

    return contenuFinal;
  };

  const handleSave = async () => {
    const contenuAvecPlaceholders = remplacerPlaceholders(formData.contenu);
    await createCourrierMutation.mutateAsync({
      ...formData,
      contenu: contenuAvecPlaceholders
    });
    setShowDialog(false);
    setFormData({
      patient_id: patientId,
      date_courrier: new Date().toISOString(),
      contenu: "",
      modele_utilise: ""
    });
  };

  const handleSaveAndPrint = async () => {
    const contenuAvecPlaceholders = remplacerPlaceholders(formData.contenu);
    const dataToSave = {
      ...formData,
      contenu: contenuAvecPlaceholders
    };
    
    await createCourrierMutation.mutateAsync(dataToSave);
    setShowDialog(false);
    setFormData({
      patient_id: patientId,
      date_courrier: new Date().toISOString(),
      contenu: "",
      modele_utilise: ""
    });
    
    setTimeout(() => {
      imprimerCourrier(dataToSave);
    }, 300);
  };

  const genererHtmlCourrier = (courrier) => {
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
          .date {
            margin: 30px 0;
          }
          .contenu {
            margin: 20px 0;
            white-space: pre-wrap;
            line-height: 1.6;
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
        
        <div class="date">
          <p>Le ${format(new Date(), 'dd/MM/yyyy')}</p>
        </div>
        
        <div class="contenu">
          ${courrier.contenu}
        </div>
        
        <div class="signature">
          ${medecin?.signature_image_url ? `<img src="${medecin.signature_image_url}" alt="Signature" style="max-width: 200px; margin-top: 10px;" />` : '<p style="margin-top: 60px; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">Signature</p>'}
        </div>
      </body>
      </html>
    `;
  };

  const imprimerCourrier = (courrier) => {
    const htmlContent = genererHtmlCourrier(courrier);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("Impossible d'ouvrir la fenêtre d'impression. Veuillez autoriser les pop-ups.");
    }
  };

  const handleDelete = (courrier) => {
    if (!canCreate) return;
    
    const dateCourrier = new Date(courrier.date_courrier);
    const maintenant = new Date();
    const differenceHeures = (maintenant - dateCourrier) / (1000 * 60 * 60);
    
    if (differenceHeures > 24) {
      toast.error("Impossible de supprimer un courrier de plus de 24 heures");
      return;
    }
    
    if (confirm('Voulez-vous vraiment supprimer ce courrier ?')) {
      deleteCourrierMutation.mutate(courrier.id);
    }
  };

  const handleEnvoyerEmail = async (courrier) => {
    if (!patient.email) {
      toast.error("Le patient n'a pas d'adresse email renseignée");
      return;
    }
    
    const user = await base44.auth.me();
    const messagePersonnalise = user?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre courrier médical.\n\nCordialement,";
    
    const htmlContent = genererHtmlCourrier(courrier);
    const sujet = `Courrier médical`;
    const nomFichier = `Courrier_${patient.nom}_${patient.prenom}_${format(new Date(), 'yyyyMMdd')}`;
    
    await genererPdfEtOuvrirEmail(htmlContent, patient.email, sujet, nomFichier, messagePersonnalise);
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Courriers</h2>
        {canCreate && (
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouveau courrier
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : courriers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Aucun courrier enregistré
            </CardContent>
          </Card>
        ) : (
          courriers.map((courrier) => {
            const dateCourrier = new Date(courrier.date_courrier);
            const maintenant = new Date();
            const differenceHeures = (maintenant - dateCourrier) / (1000 * 60 * 60);
            const peutSupprimer = canCreate && differenceHeures <= 24;
            
            return (
              <Card key={courrier.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">Courrier médical</CardTitle>
                      <p className="text-sm text-gray-500">
                        {format(new Date(courrier.date_courrier), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {canPrintOrEmail && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => imprimerCourrier(courrier)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEnvoyerEmail(courrier)}
                            disabled={!patient.email}
                            title={patient.email ? "Envoyer par email" : "Patient sans email"}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {canCreate && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(courrier)}
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
                      {courrier.contenu}
                    </pre>
                  </div>
                  {courrier.modele_utilise && (
                    <p className="text-xs text-gray-500 mt-3">
                      Modèle utilisé: {courrier.modele_utilise}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouveau courrier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="ml-2 text-sm">
                <strong>Variables disponibles :</strong>
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#PATIENT</code> → M/Mme Nom Prénom du patient
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#AV</code> → Acuité visuelle de loin
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#AVP</code> → Acuité visuelle de près
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#PIO</code> → PIO corrigée du jour
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#REF</code> → Réfraction subjective du jour
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#LAF</code> → Lampe à fente du jour
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#FO</code> → Fond d'œil du jour
                <br />
                • <code className="bg-white px-1 py-0.5 rounded">#CON</code> → Conclusion du jour
              </AlertDescription>
            </Alert>

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
              <Label>Contenu du courrier</Label>
              <Textarea
                value={formData.contenu}
                onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                rows={18}
                placeholder="Rédigez le courrier... Utilisez les variables #PATIENT, #AV, #AVP, #PIO, #REF, #LAF, #FO, #CON"
                className="font-sans"
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formData.contenu}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </Button>
              <Button
                onClick={handleSaveAndPrint}
                disabled={!formData.contenu}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
                title="Enregistrer et imprimer (F5)"
              >
                <Printer className="w-4 h-4" />
                Enregistrer et imprimer (F5)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
