
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointerClick, Printer, Trash2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { isSameDay, format } from "date-fns";
import { toast } from "sonner";
import { genererPdfEtOuvrirEmail } from "./PdfEmailHelper";

export default function CotationSection({ patientId, patient }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { specialite: 'ophtalmologue', email: 'default@user.com' });
    };
    loadUser();
  }, []);

  const canCreate = true; // Always true
  const canPrintOrEmail = true; // Always true

  const { data: associations } = useQuery({
    queryKey: ['associations-cotation'],
    queryFn: () => base44.entities.AssociationCotation.list(),
    initialData: [],
  });

  const { data: actes } = useQuery({
    queryKey: ['actes-medicaux'],
    queryFn: () => base44.entities.ActeMedical.list(),
    initialData: [],
  });

  const { data: cotations, isLoading } = useQuery({
    queryKey: ['cotations', patientId],
    queryFn: async () => {
      const allCotations = await base44.entities.Cotation.list('-date_cotation');
      return allCotations.filter(c => c.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-print'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createCotationMutation = useMutation({
    mutationFn: (data) => base44.entities.Cotation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotations', patientId] });
      queryClient.invalidateQueries({ queryKey: ['toutes-cotations'] });
    },
  });

  const deleteCotationMutation = useMutation({
    mutationFn: (id) => base44.entities.Cotation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cotations', patientId] });
      queryClient.invalidateQueries({ queryKey: ['toutes-cotations'] });
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

  const handleDoubleClick = (association) => {
    const actesWithDetails = association.actes_ids.map((acteId, index) => {
      const acte = actes.find(a => a.id === acteId);
      if (!acte) return null;
      
      const pourcentage = index === 0 ? 100 : 50;
      const tarifAvecPourcentage = (acte.tarif_base * pourcentage) / 100;
      const depassement = association.depassements?.[index] || 0;
      
      return {
        acte_id: acte.id,
        code: acte.code,
        libelle: acte.libelle,
        tarif_base: acte.tarif_base,
        pourcentage_applique: pourcentage,
        depassement: depassement,
      };
    }).filter(Boolean);

    const totalBase = actesWithDetails.reduce((sum, a) => {
      return sum + ((a.tarif_base * a.pourcentage_applique) / 100);
    }, 0);
    
    const totalDepassement = actesWithDetails.reduce((sum, a) => sum + a.depassement, 0);
    const totalGlobal = totalBase + totalDepassement;

    createCotationMutation.mutate({
      patient_id: patientId,
      date_cotation: new Date().toISOString(),
      actes: actesWithDetails,
      total_base: totalBase,
      total_depassement: totalDepassement,
      total_global: totalGlobal
    });
  };

  const handleDeleteCotation = (cotationId) => {
    if (confirm('Voulez-vous vraiment supprimer cette cotation ?')) {
      deleteCotationMutation.mutate(cotationId);
    }
  };

  const genererHtmlFacture = (cotation) => {
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
          .facture-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .facture-table th,
          .facture-table td {
            border: 1px solid #333;
            padding: 12px;
            text-align: left;
          }
          .facture-table th {
            background-color: #e0e0e0;
            font-weight: bold;
          }
          .facture-table td.montant {
            text-align: right;
          }
          .totaux {
            margin: 30px 0;
            padding: 15px;
            background-color: #f0f0f0;
            border-radius: 5px;
          }
          .totaux p {
            margin: 8px 0;
            font-size: 16px;
          }
          .total-final {
            font-size: 24px;
            font-weight: bold;
            color: #2e7d32;
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

        <div class="title">Facture</div>

        <div class="patient-info">
          <p><strong>Patient(e) :</strong> ${patient.prenom} ${patient.nom}</p>
          ${patient.date_naissance ? `<p><strong>Date de naissance :</strong> ${format(new Date(patient.date_naissance), 'dd/MM/yyyy')}</p>` : ''}
          <p><strong>Date :</strong> ${format(new Date(cotation.date_cotation), 'dd/MM/yyyy')}</p>
        </div>

        <h3>Détail des actes</h3>
        <table class="facture-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th style="text-align: center;">Pourcentage</th>
              <th style="text-align: right;">Tarif de base</th>
              <th style="text-align: right;">Dépassement</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${cotation.actes?.map(acte => `
              <tr>
                <td><strong>${acte.code}</strong></td>
                <td>${acte.libelle}</td>
                <td style="text-align: center;">${acte.pourcentage_applique}%</td>
                <td class="montant">${(acte.tarif_base * acte.pourcentage_applique / 100).toFixed(2)}€</td>
                <td class="montant">${acte.depassement.toFixed(2)}€</td>
                <td class="montant"><strong>${((acte.tarif_base * acte.pourcentage_applique / 100) + acte.depassement).toFixed(2)}€</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totaux">
          <p><strong>Total tarif de base :</strong> ${cotation.total_base?.toFixed(2)}€</p>
          ${cotation.total_depassement > 0 ? `<p><strong>Total dépassement :</strong> ${cotation.total_depassement?.toFixed(2)}€</p>` : ''}
          <p class="total-final"><strong>TOTAL À PAYER :</strong> ${cotation.total_global?.toFixed(2)}€</p>
        </div>

        <div class="signature">
          <p>Le ${format(new Date(), 'dd/MM/yyyy')}</p>
          ${medecin?.signature_image_url ? `<img src="${medecin.signature_image_url}" alt="Signature" style="max-width: 200px; margin-top: 10px;" />` : '<p style="margin-top: 60px; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">Signature</p>'}
        </div>
      </body>
      </html>
    `;
  };

  const imprimerFacture = (cotation) => {
    const htmlContent = genererHtmlFacture(cotation);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleEnvoyerEmail = async (cotation) => {
    if (!patient.email) {
      toast.error("Le patient n'a pas d'adresse email renseignée");
      return;
    }
    
    const user = await base44.auth.me();
    const messagePersonnalise = user?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre facture.\n\nCordialement,";
    
    const htmlContent = genererHtmlFacture(cotation);
    const sujet = `Facture - ${format(new Date(cotation.date_cotation), 'dd/MM/yyyy')}`;
    const nomFichier = `Facture_${patient.nom}_${patient.prenom}_${format(new Date(cotation.date_cotation), 'yyyyMMdd')}`;
    
    await genererPdfEtOuvrirEmail(htmlContent, patient.email, sujet, nomFichier, messagePersonnalise);
  };

  return (
    <div className="space-y-6 pb-4">
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MousePointerClick className="w-4 h-4" />
            Raccourcis de cotation
            <span className="text-xs text-gray-500 font-normal ml-2">(Double-clic pour sélectionner)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            {associations.length === 0 ? (
              <p className="text-center text-gray-500 py-8 text-sm">
                Aucun raccourci créé. Allez dans Gestion → Cotation pour en créer.
              </p>
            ) : (
              <div className="space-y-1">
                {associations.map((association) => {
                  const actesDetails = association.actes_ids?.map((acteId, index) => {
                    const acte = actes.find(a => a.id === acteId);
                    if (!acte) return null;
                    
                    const pourcentage = index === 0 ? 100 : 50;
                    const tarifBase = acte.tarif_base;
                    const tarifAvecPourcentage = (tarifBase * pourcentage) / 100;
                    const depassement = association.depassements?.[index] || 0;
                    const total = tarifAvecPourcentage + depassement;
                    
                    return {
                      code: acte.code,
                      libelle: acte.libelle,
                      tarifBase,
                      pourcentage,
                      depassement,
                      total
                    };
                  }).filter(Boolean) || [];

                  const totalGlobal = actesDetails.reduce((sum, a) => sum + a.total, 0);

                  return (
                    <div
                      key={association.id}
                      className="hover:bg-blue-50 transition-all cursor-pointer border rounded-md p-2"
                      onDoubleClick={() => handleDoubleClick(association)}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-gray-800">{association.nom}</p>
                          <div className="flex gap-2 mt-1">
                            {actesDetails.map((acte, idx) => (
                              <span key={idx} className="text-xs text-gray-600">
                                {acte.code}
                                {acte.pourcentage !== 100 && <span className="text-gray-400 ml-0.5">({acte.pourcentage}%)</span>}
                                {idx < actesDetails.length - 1 && <span className="mx-1">•</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-gray-700">{totalGlobal.toFixed(2)}€</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-xl">Historique des cotations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : cotations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucune cotation enregistrée pour ce patient
            </div>
          ) : (
            <div className="space-y-4">
              {cotations.map((cotation) => {
                const isToday = new Date(cotation.date_cotation).toDateString() === new Date().toDateString();
                
                return (
                  <Card key={cotation.id} className="border-2 border-gray-200">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 py-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">
                            {format(new Date(cotation.date_cotation), 'dd/MM/yyyy à HH:mm')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {cotation.actes?.length || 0} acte(s)
                          </p>
                        </div>
                        <div className="flex gap-2 items-center">
                          <p className="text-2xl font-bold text-green-700">
                            {cotation.total_global?.toFixed(2)}€
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => imprimerFacture(cotation)}
                            className="h-8 px-2"
                            title="Imprimer la facture"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEnvoyerEmail(cotation)}
                            className="h-8 px-2"
                            title="Envoyer par email"
                            disabled={!patient.email}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                          {isToday && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCotation(cotation.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                              title="Supprimer (uniquement aujourd'hui)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="space-y-2">
                        {cotation.actes?.map((acte, idx) => (
                          <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{acte.code}</span>
                              <span className="text-xs text-gray-500">({acte.pourcentage_applique}%)</span>
                              <span className="text-sm text-gray-700">{acte.libelle}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {((acte.tarif_base * acte.pourcentage_applique / 100) + acte.depassement).toFixed(2)}€
                              </p>
                              {acte.depassement > 0 && (
                                <p className="text-xs text-gray-500">
                                  (dont {acte.depassement.toFixed(2)}€ dépassement)
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Total tarif de base:</span>
                          <span className="font-semibold">{cotation.total_base?.toFixed(2)}€</span>
                        </div>
                        {cotation.total_depassement > 0 && (
                          <div className="flex justify-between text-sm mb-1">
                            <span>Total dépassement:</span>
                            <span className="font-semibold">{cotation.total_depassement?.toFixed(2)}€</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-green-700 mt-2">
                          <span>TOTAL:</span>
                          <span>{cotation.total_global?.toFixed(2)}€</span>
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
    </div>
  );
}
