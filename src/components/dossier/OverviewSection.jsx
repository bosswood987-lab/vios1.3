
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, Eye, Image, FileText, Glasses, Activity, Printer, Pill, Contact, Mail } from "lucide-react";
import { toast } from "sonner";
import { genererPdfEtOuvrirEmail } from "./PdfEmailHelper";

export default function OverviewSection({ patientId, patient }) {
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: examensOrthoptiste } = useQuery({
    queryKey: ['examens-orthoptiste', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOrthoptiste.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: examensOphtalmologie } = useQuery({
    queryKey: ['examens-ophtalmologie', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOphtalmologie.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: imageries } = useQuery({
    queryKey: ['imageries', patientId],
    queryFn: async () => {
      const all = await base44.entities.Imagerie.list('-date_imagerie');
      return all.filter(i => i.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: verresPrescrit } = useQuery({
    queryKey: ['verres-prescrit', patientId],
    queryFn: async () => {
      const allVerres = await base44.entities.VerresPrescrit.list('-date_prescription');
      return allVerres.filter(v => v.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: ordonnances } = useQuery({
    queryKey: ['ordonnances-overview', patientId],
    queryFn: async () => {
      const allOrdonnances = await base44.entities.Ordonnance.list('-date_ordonnance');
      return allOrdonnances.filter(o => o.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: lentilles } = useQuery({
    queryKey: ['lentilles-overview', patientId],
    queryFn: async () => {
      const allLentilles = await base44.entities.PrescriptionLentille.list('-date_prescription');
      return allLentilles.filter(l => l.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: users } = useQuery({
    queryKey: ['users-for-print'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  // Créer une structure combinée des examens par date
  const examensParDate = {};

  examensOrthoptiste.forEach(examen => {
    const dateKey = format(new Date(examen.date_examen), 'yyyy-MM-dd');
    if (!examensParDate[dateKey]) {
      examensParDate[dateKey] = {
        date: examen.date_examen,
        orthoptistes: [], // Changed from single to array
        ophtalmologie: null,
        imageries: [],
        verres: [],
        ordonnances: [],
        lentilles: []
      };
    }
    examensParDate[dateKey].orthoptistes.push(examen);
  });

  examensOphtalmologie.forEach(examen => {
    const dateKey = format(new Date(examen.date_examen), 'yyyy-MM-dd');
    if (!examensParDate[dateKey]) {
      examensParDate[dateKey] = {
        date: examen.date_examen,
        orthoptistes: [],
        ophtalmologie: null,
        imageries: [],
        verres: [],
        ordonnances: [],
        lentilles: []
      };
    }
    examensParDate[dateKey].ophtalmologie = examen;
  });

  imageries.forEach(img => {
    const dateKey = format(new Date(img.date_imagerie), 'yyyy-MM-dd');
    if (!examensParDate[dateKey]) {
      examensParDate[dateKey] = {
        date: img.date_imagerie,
        orthoptistes: [],
        ophtalmologie: null,
        imageries: [],
        verres: [],
        ordonnances: [],
        lentilles: []
      };
    }
    examensParDate[dateKey].imageries.push(img);
  });

  verresPrescrit.forEach(verre => {
    const dateKey = format(new Date(verre.date_prescription), 'yyyy-MM-dd');
    if (examensParDate[dateKey]) {
      examensParDate[dateKey].verres.push(verre);
    }
  });

  ordonnances.forEach(ord => {
    const dateKey = format(new Date(ord.date_ordonnance), 'yyyy-MM-dd');
    if (examensParDate[dateKey]) {
      examensParDate[dateKey].ordonnances.push(ord);
    }
  });

  lentilles.forEach(lent => {
    const dateKey = format(new Date(lent.date_prescription), 'yyyy-MM-dd');
    if (examensParDate[dateKey]) {
      examensParDate[dateKey].lentilles.push(lent);
    }
  });

  const examensTriesParDate = Object.values(examensParDate).sort((a, b) => 
    new Date(b.date) - new Date(a.date)
  );

  const formatRefraction = (sphere, cylindre, axe, av = null) => {
    if (!sphere && !cylindre && !axe && !av) return "—";
    let result = "";
    if (sphere !== null && sphere !== undefined && sphere !== "") result += sphere;
    if (cylindre !== null && cylindre !== undefined && cylindre !== "") result += ` (${cylindre}`;
    if (axe !== null && axe !== undefined && axe !== "") result += ` à ${axe}°`;
    if (cylindre !== null && cylindre !== undefined && cylindre !== "") result += ")";
    if (av !== null && av !== undefined && av !== "") result += ` AV: ${av}`;
    return result || "—";
  };

  const genererHtmlApercu = (examen) => {
    const medecin = users.find(u => u.specialite === 'admin' || u.specialite === 'ophtalmologue') || currentUser;
    const entete = medecin?.entete_ordonnance || '';
    
    const orthoptistes = examen.orthoptistes || []; // Now an array
    const ophtalmo = examen.ophtalmologie;
    
    const nomMedecinOphtalmo = ophtalmo?.created_by 
      ? (() => {
          const user = users.find(u => u.email === ophtalmo.created_by);
          return user?.nom_affichage || user?.full_name || '';
        })()
      : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Aperçu - ${patient.prenom} ${patient.nom} - ${format(new Date(examen.date), 'dd/MM/yyyy')}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            font-size: 11px;
          }
          .header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #333;
          }
          .header img {
            max-width: 100%;
            height: auto;
          }
          .medecin-info {
            text-align: left;
            font-size: 9px;
            color: #666;
            margin-bottom: 10px;
            padding: 5px;
            background-color: #f9f9f9;
            border-left: 3px solid #999;
          }
          .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0;
            text-transform: uppercase;
          }
          .patient-info {
            margin: 15px 0;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 5px;
          }
          .patient-info p {
            margin: 3px 0;
          }
          .section {
            margin: 10px 0;
            padding: 8px;
            border-left: 3px solid #666;
            background-color: #f9f9f9;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 5px;
            color: #333;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 5px;
          }
          .examen-badge {
            display: inline-block;
            background-color: #e3f2fd;
            color: #1976d2;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: bold;
            margin-right: 5px;
          }
          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="header">
          ${entete ? `<img src="${entete}" alt="En-tête" />` : '<p style="text-align: center; font-size: 16px; font-weight: bold;">Cabinet d\'Ophtalmologie</p>'}
        </div>
        
        ${nomMedecinOphtalmo ? `
          <div class="medecin-info">
            Dr ${nomMedecinOphtalmo}
          </div>
        ` : ''}
        
        <div class="title">Aperçu de consultation</div>
        
        <div class="patient-info">
          <p><strong>Patient(e) :</strong> ${patient.prenom} ${patient.nom}</p>
          ${patient.date_naissance ? `<p><strong>Date de naissance :</strong> ${format(new Date(patient.date_naissance), 'dd/MM/yyyy')}</p>` : ''}
          <p><strong>Date de consultation :</strong> ${format(new Date(examen.date), 'dd/MM/yyyy à HH:mm')}</p>
        </div>
        
        ${orthoptistes.map((ortho, idx) => `
          ${ortho.motif_consultation ? `
            <div class="section">
              <div class="section-title">
                <span class="examen-badge">Examen Orthoptiste ${idx + 1}</span>
                Motif de consultation
              </div>
              <div>${ortho.motif_consultation}</div>
            </div>
          ` : ''}
          
          ${idx === 0 && (ortho.allergie || ortho.atcd_med || ortho.atcd_oph) ? `
            <div class="section">
              <div class="section-title">Antécédents</div>
              ${ortho.allergie ? `<div><strong>Allergie:</strong> ${ortho.allergie}</div>` : ''}
              ${ortho.atcd_med ? `<div><strong>ATCD médicaux:</strong> ${ortho.atcd_med}</div>` : ''}
              ${ortho.atcd_oph ? `<div><strong>ATCD ophtalmologiques:</strong> ${ortho.atcd_oph}</div>` : ''}
            </div>
          ` : ''}
          
          ${idx === 0 && (ortho.pio_od || ortho.pio_og || ortho.pachymetrie_od || ortho.pachymetrie_og) ? `
            <div class="section">
              <div class="section-title">PIO & Pachymétrie</div>
              <div class="grid">
                ${(ortho.pio_od || ortho.pachymetrie_od) ? `<div><strong>OD:</strong> PIO: ${ortho.pio_od || "—"} mmHg, Pachy: ${ortho.pachymetrie_od || "—"} µm</div>` : ''}
                ${(ortho.pio_og || ortho.pachymetrie_og) ? `<div><strong>OG:</strong> PIO: ${ortho.pio_og || "—"} mmHg, Pachy: ${ortho.pachymetrie_og || "—"} µm</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${idx === 0 && (ortho.lunettes_portees_od_sphere || ortho.lunettes_portees_og_sphere) ? `
            <div class="section">
              <div class="section-title">Lunettes portées</div>
              <div class="grid">
                ${ortho.lunettes_portees_od_sphere ? `<div><strong>OD:</strong> ${formatRefraction(ortho.lunettes_portees_od_sphere, ortho.lunettes_portees_od_cylindre, ortho.lunettes_portees_od_axe, ortho.lunettes_portees_od_av)}</div>` : ''}
                ${ortho.lunettes_portees_og_sphere ? `<div><strong>OG:</strong> ${formatRefraction(ortho.lunettes_portees_og_sphere, ortho.lunettes_portees_og_cylindre, ortho.lunettes_portees_og_axe, ortho.lunettes_portees_og_av)}</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${ortho.ref_subjective_od_sphere || ortho.ref_subjective_og_sphere ? `
            <div class="section">
              <div class="section-title">
                <span class="examen-badge">Examen Orthoptiste ${idx + 1}</span>
                Réfraction subjective ${ortho.ref_subjective_sous_skiacol ? '(Sous cycloplégie)' : ''}
              </div>
              <div class="grid">
                ${ortho.ref_subjective_od_sphere ? `<div><strong>OD:</strong> ${formatRefraction(ortho.ref_subjective_od_sphere, ortho.ref_subjective_od_cylindre, ortho.ref_subjective_od_axe, ortho.ref_subjective_od_avl)} ${ortho.ref_subjective_od_add ? `Add: ${ortho.ref_subjective_od_add}` : ''}</div>` : ''}
                ${ortho.ref_subjective_og_sphere ? `<div><strong>OG:</strong> ${formatRefraction(ortho.ref_subjective_og_sphere, ortho.ref_subjective_og_cylindre, ortho.ref_subjective_og_axe, ortho.ref_subjective_og_avl)} ${ortho.ref_subjective_og_add ? `Add: ${ortho.ref_subjective_og_add}` : ''}</div>` : ''}
              </div>
            </div>
          ` : ''}
          
          ${idx === 0 && (ortho.examen_motilite || ortho.convergence || ortho.phories || ortho.tropies) ? `
            <div class="section">
              <div class="section-title">Motilité</div>
              <div>${ortho.examen_motilite || [ortho.convergence, ortho.phories, ortho.tropies].filter(Boolean).join(", ")}</div>
            </div>
          ` : ''}
        `).join('')}
        
        ${examen.verres.length > 0 ? `
          <div class="section">
            <div class="section-title">Lunettes prescrites</div>
            ${examen.verres.map(verre => `
              <div style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #999;">
                <div><strong>${verre.type_vision}</strong></div>
                <div class="grid">
                  ${(verre.od_sphere || verre.od_cylindre || verre.od_axe) ? `<div><strong>OD:</strong> ${formatRefraction(verre.od_sphere, verre.od_cylindre, verre.od_axe)} ${verre.od_addition ? `Add: ${verre.od_addition}` : ''}</div>` : ''}
                  ${(verre.og_sphere || verre.og_cylindre || verre.og_axe) ? `<div><strong>OG:</strong> ${formatRefraction(verre.og_sphere, verre.og_cylindre, verre.og_axe)} ${verre.og_addition ? `Add: ${verre.og_addition}` : ''}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${examen.lentilles.length > 0 ? `
          <div class="section">
            <div class="section-title">Lentilles prescrites</div>
            ${examen.lentilles.map(lent => `
              <div style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #999;">
                <div class="grid">
                  ${(lent.od_sphere || lent.od_cylindre || lent.od_axe) ? `<div><strong>OD:</strong> ${formatRefraction(lent.od_sphere, lent.od_cylindre, lent.od_axe)} ${lent.od_addition ? `Add: ${lent.od_addition}` : ''}</div>` : ''}
                  ${(lent.og_sphere || lent.og_cylindre || lent.og_axe) ? `<div><strong>OG:</strong> ${formatRefraction(lent.og_sphere, lent.og_cylindre, lent.og_axe)} ${lent.og_addition ? `Add: ${lent.og_addition}` : ''}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${ophtalmo?.lampe_fente_od || ophtalmo?.lampe_fente_og ? `
          <div class="section">
            <div class="section-title">Lampe à fente</div>
            <div class="grid">
              ${ophtalmo.lampe_fente_od ? `<div><strong>OD:</strong> ${ophtalmo.lampe_fente_od}</div>` : ''}
              ${ophtalmo.lampe_fente_og ? `<div><strong>OG:</strong> ${ophtalmo.lampe_fente_og}</div>` : ''}
            </div>
          </div>
        ` : ''}
        
        ${ophtalmo?.fond_oeil_od || ophtalmo?.fond_oeil_og ? `
          <div class="section">
            <div class="section-title">Fond d'œil</div>
            <div class="grid">
              ${ophtalmo.fond_oeil_od ? `<div><strong>OD:</strong> ${ophtalmo.fond_oeil_od}</div>` : ''}
              ${ophtalmo.fond_oeil_og ? `<div><strong>OG:</strong> ${ophtalmo.fond_oeil_og}</div>` : ''}
            </div>
          </div>
        ` : ''}
        
        ${examen.imageries.length > 0 ? `
          <div class="section">
            <div class="section-title">Imagerie</div>
            ${examen.imageries.map(img => `
              <div style="margin-top: 5px;">
                <strong>${img.type_examen.replace(/_/g, ' ')} - ${img.oeil}</strong>
                ${img.interpretation ? `<div>${img.interpretation}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${examen.ordonnances.length > 0 ? `
          <div class="section">
            <div class="section-title">Ordonnances</div>
            ${examen.ordonnances.map(ord => `
              <div style="margin-top: 8px; padding-left: 10px; border-left: 2px solid #999;">
                <div><strong>${ord.type_ordonnance?.replace(/_/g, ' ')}</strong></div>
                <pre style="white-space: pre-wrap; font-family: Arial; margin-top: 5px;">${ord.contenu}</pre>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        ${(ophtalmo?.diagnostic || ophtalmo?.conduite_tenir) ? `
          <div class="section" style="border-left: 3px solid #4caf50; background-color: #e8f5e9;">
            <div class="section-title">Conclusion</div>
            ${ophtalmo.diagnostic ? `<div><strong>Diagnostic:</strong> ${ophtalmo.diagnostic}</div>` : ''}
            ${ophtalmo.conduite_tenir ? `<div><strong>CAT:</strong> ${ophtalmo.conduite_tenir}</div>` : ''}
          </div>
        ` : ''}
      </body>
      </html>
    `;
  };

  const imprimerApercu = (examen) => {
    const htmlContent = genererHtmlApercu(examen);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  };

  const handleEnvoyerEmail = async (examen) => {
    if (!patient.email) {
      toast.error("Le patient n'a pas d'adresse email renseignée");
      return;
    }
    
    try {
      const user = await base44.auth.me();
      const messagePersonnalise = user?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre compte rendu de consultation.\n\nCordialement,";
      
      const htmlContent = genererHtmlApercu(examen);
      const sujet = `Compte rendu de consultation - ${format(new Date(examen.date), 'dd/MM/yyyy')}`;
      const nomFichier = `Compte_Rendu_${patient.nom}_${patient.prenom}_${format(new Date(examen.date), 'yyyyMMdd')}`;
      
      await genererPdfEtOuvrirEmail(htmlContent, patient.email, sujet, nomFichier, messagePersonnalise);
      toast.success("Client email ouvert avec le PDF joint.");
    } catch (error) {
      console.error('Erreur lors de la génération ou l\'ouverture du client email:', error);
      toast.error("Erreur lors de la préparation ou l'envoi du PDF par email.");
    }
  };

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center gap-2 mb-4">
        <Eye className="w-5 h-5 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Aperçu</h2>
      </div>

      {examensTriesParDate.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            Aucun examen enregistré
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {examensTriesParDate.map((examen, index) => {
            const orthoptistes = examen.orthoptistes || [];
            const ophtalmo = examen.ophtalmologie;
            const isExamenDuJour = index === 0;
            
            const nomMedecinOphtalmo = ophtalmo?.created_by 
              ? (() => {
                  const user = users.find(u => u.email === ophtalmo.created_by);
                  return user?.nom_affichage || user?.full_name || '';
                })()
              : '';

            return (
              <Card key={examen.date} className={isExamenDuJour ? "border-2 border-blue-400 shadow-lg" : ""}>
                <CardHeader className={`py-2 px-3 ${isExamenDuJour ? "bg-blue-50" : "bg-gray-50"}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {nomMedecinOphtalmo && (
                        <p className="text-xs text-gray-400 mb-1 italic">
                          Dr {nomMedecinOphtalmo}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <CardTitle className="text-sm font-semibold">
                          {format(new Date(examen.date), 'dd/MM/yyyy à HH:mm')}
                        </CardTitle>
                        {isExamenDuJour && (
                          <Badge className="bg-blue-600 text-white text-xs">Examen du jour</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => imprimerApercu(examen)}
                        className="h-8 w-8 p-0"
                        title="Imprimer cet aperçu"
                      >
                        <Printer className="w-4 h-4 text-gray-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEnvoyerEmail(examen)}
                        className="h-8 w-8 p-0"
                        title="Envoyer par email"
                        disabled={!patient.email} 
                      >
                        <Mail className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-3 text-xs space-y-2">
                  {orthoptistes.map((ortho, orthoIdx) => (
                    <div key={orthoIdx}>
                      {ortho.motif_consultation && (
                        <div>
                          <strong className="text-blue-700">
                            <Badge className="bg-blue-100 text-blue-700 text-xs mr-1">Examen Orthoptiste {orthoIdx + 1}</Badge>
                            Motif:
                          </strong> {ortho.motif_consultation}
                        </div>
                      )}

                      {orthoIdx === 0 && (ortho.allergie || ortho.atcd_med || ortho.atcd_oph) && (
                        <div className="grid grid-cols-1 gap-1">
                          {ortho.allergie && (
                            <div><strong className="text-red-600">Allergie:</strong> {ortho.allergie}</div>
                          )}
                          {ortho.atcd_med && (
                            <div><strong className="text-purple-600">ATCD médicaux:</strong> {ortho.atcd_med}</div>
                          )}
                          {ortho.atcd_oph && (
                            <div><strong className="text-orange-600">ATCD ophtalmologiques:</strong> {ortho.atcd_oph}</div>
                          )}
                        </div>
                      )}

                      {orthoIdx === 0 && (ortho.pio_od || ortho.pio_og || ortho.pachymetrie_od || ortho.pachymetrie_og) && (
                        <div className="bg-amber-50 p-2 rounded">
                          <strong className="text-amber-700">PIO & Pachymétrie:</strong>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {(ortho.pio_od || ortho.pachymetrie_od) && (
                              <div>
                                <span className="font-semibold">OD:</span> PIO: {ortho.pio_od || "—"} mmHg, Pachy: {ortho.pachymetrie_od || "—"} µm
                              </div>
                            )}
                            {(ortho.pio_og || ortho.pachymetrie_og) && (
                              <div>
                                <span className="font-semibold">OG:</span> PIO: {ortho.pio_og || "—"} mmHg, Pachy: {ortho.pachymetrie_og || "—"} µm
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {orthoIdx === 0 && (ortho.lunettes_portees_od_sphere || ortho.lunettes_portees_og_sphere) && (
                        <div className="bg-purple-50 p-2 rounded">
                          <strong className="text-purple-700 flex items-center gap-1">
                            <Glasses className="w-3 h-3" />
                            Lunettes portées:
                          </strong>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {ortho.lunettes_portees_od_sphere && (
                              <div><span className="font-semibold">OD:</span> {formatRefraction(ortho.lunettes_portees_od_sphere, ortho.lunettes_portees_od_cylindre, ortho.lunettes_portees_od_axe, ortho.lunettes_portees_od_av)}</div>
                            )}
                            {ortho.lunettes_portees_og_sphere && (
                              <div><span className="font-semibold">OG:</span> {formatRefraction(ortho.lunettes_portees_og_sphere, ortho.lunettes_portees_og_cylindre, ortho.lunettes_portees_og_axe, ortho.lunettes_portees_og_av)}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {(ortho.ref_subjective_od_sphere || ortho.ref_subjective_og_sphere) && (
                        <div className="bg-cyan-50 p-2 rounded">
                          <strong className="text-cyan-700">
                            <Badge className="bg-cyan-100 text-cyan-700 text-xs mr-1">Examen Orthoptiste {orthoIdx + 1}</Badge>
                            Réfraction subjective:
                          </strong>
                          {ortho.ref_subjective_sous_skiacol && <Badge className="ml-2 text-xs bg-cyan-600">Sous cycloplégie</Badge>}
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {ortho.ref_subjective_od_sphere && (
                              <div>
                                <span className="font-semibold">OD:</span> {formatRefraction(ortho.ref_subjective_od_sphere, ortho.ref_subjective_od_cylindre, ortho.ref_subjective_od_axe, ortho.ref_subjective_od_avl)}
                                {ortho.ref_subjective_od_add && <span className="ml-1">Add: {ortho.ref_subjective_od_add}</span>}
                              </div>
                            )}
                            {ortho.ref_subjective_og_sphere && (
                              <div>
                                <span className="font-semibold">OG:</span> {formatRefraction(ortho.ref_subjective_og_sphere, ortho.ref_subjective_og_cylindre, ortho.ref_subjective_og_axe, ortho.ref_subjective_og_avl)}
                                {ortho.ref_subjective_og_add && <span className="ml-1">Add: {ortho.ref_subjective_og_add}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {orthoIdx === 0 && (ortho.examen_motilite || ortho.convergence || ortho.phories || ortho.tropies) && (
                        <div className="bg-green-50 p-2 rounded">
                          <strong className="text-green-700 flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            Motilité:
                          </strong>
                          <div className="mt-1">{ortho.examen_motilite || [ortho.convergence, ortho.phories, ortho.tropies].filter(Boolean).join(", ")}</div>
                        </div>
                      )}
                    </div>
                  ))}

                  {examen.verres.length > 0 && (
                    <div className="bg-indigo-50 p-2 rounded">
                      <strong className="text-indigo-700 flex items-center gap-1">
                        <Glasses className="w-3 h-3" />
                        Lunettes prescrites:
                      </strong>
                      {examen.verres.map((verre, idx) => (
                        <div key={idx} className="mt-1 border-l-2 border-indigo-300 pl-2">
                          <div className="font-semibold">{verre.type_vision}</div>
                          <div className="grid grid-cols-2 gap-1">
                            {(verre.od_sphere || verre.od_cylindre || verre.od_axe) && (
                              <div><span className="font-semibold">OD:</span> {formatRefraction(verre.od_sphere, verre.od_cylindre, verre.od_axe)} {verre.od_addition && `Add: ${verre.od_addition}`}</div>
                            )}
                            {(verre.og_sphere || verre.og_cylindre || verre.og_axe) && (
                              <div><span className="font-semibold">OG:</span> {formatRefraction(verre.og_sphere, verre.og_cylindre, verre.og_axe)} {verre.og_addition && `Add: ${verre.og_addition}`}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {examen.lentilles.length > 0 && (
                    <div className="bg-pink-50 p-2 rounded">
                      <strong className="text-pink-700 flex items-center gap-1">
                        <Contact className="w-3 h-3" />
                        Lentilles prescrites:
                      </strong>
                      {examen.lentilles.map((lent, idx) => (
                        <div key={idx} className="mt-1 border-l-2 border-pink-300 pl-2">
                          <div className="grid grid-cols-2 gap-1">
                            {(lent.od_sphere || lent.od_cylindre || lent.od_axe) && (
                              <div><span className="font-semibold">OD:</span> {formatRefraction(lent.od_sphere, lent.od_cylindre, lent.od_axe)} {lent.od_addition && `Add: ${lent.od_addition}`}</div>
                            )}
                            {(lent.og_sphere || lent.og_cylindre || lent.og_axe) && (
                              <div><span className="font-semibold">OG:</span> {formatRefraction(lent.og_sphere, lent.og_cylindre, lent.og_axe)} {lent.og_addition && `Add: ${lent.og_addition}`}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {ophtalmo && (
                    <>
                      {(ophtalmo.lampe_fente_od || ophtalmo.lampe_fente_og) && (
                        <div className="bg-blue-50 p-2 rounded">
                          <strong className="text-blue-700">Lampe à fente:</strong>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {ophtalmo.lampe_fente_od && (
                              <div><span className="font-semibold">OD:</span> {ophtalmo.lampe_fente_od}</div>
                            )}
                            {ophtalmo.lampe_fente_og && (
                              <div><span className="font-semibold">OG:</span> {ophtalmo.lampe_fente_og}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {(ophtalmo.fond_oeil_od || ophtalmo.fond_oeil_og) && (
                        <div className="bg-red-50 p-2 rounded">
                          <strong className="text-red-700">Fond d'œil:</strong>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            {ophtalmo.fond_oeil_od && (
                              <div><span className="font-semibold">OD:</span> {ophtalmo.fond_oeil_od}</div>
                            )}
                            {ophtalmo.fond_oeil_og && (
                              <div><span className="font-semibold">OG:</span> {ophtalmo.fond_oeil_og}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {examen.imageries.length > 0 && (
                    <div className="bg-teal-50 p-2 rounded">
                      <strong className="text-teal-700 flex items-center gap-1">
                        <Image className="w-3 h-3" />
                        Imagerie:
                      </strong>
                      {examen.imageries.map((img, idx) => (
                        <div key={idx} className="mt-1 border-l-2 border-teal-300 pl-2">
                          <div className="font-semibold">{img.type_examen.replace(/_/g, ' ')} - {img.oeil}</div>
                          {img.interpretation && <div className="text-gray-700">{img.interpretation}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {examen.ordonnances.length > 0 && (
                    <div className="bg-orange-50 p-2 rounded">
                      <strong className="text-orange-700 flex items-center gap-1">
                        <Pill className="w-3 h-3" />
                        Ordonnances:
                      </strong>
                      {examen.ordonnances.map((ord, idx) => (
                        <div key={idx} className="mt-1 border-l-2 border-orange-300 pl-2">
                          <div className="font-semibold">{ord.type_ordonnance?.replace(/_/g, ' ')}</div>
                          <pre className="text-gray-700 whitespace-pre-wrap font-sans mt-1 text-xs">{ord.contenu}</pre>
                        </div>
                      ))}
                    </div>
                  )}

                  {ophtalmo && (ophtalmo.diagnostic || ophtalmo.conduite_tenir) && (
                    <div className="bg-green-50 p-2 rounded border-l-4 border-green-500">
                      <strong className="text-green-700 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Conclusion:
                      </strong>
                      {ophtalmo.diagnostic && (
                        <div className="mt-1">
                          <span className="font-semibold text-green-800">Diagnostic:</span> {ophtalmo.diagnostic}
                        </div>
                      )}
                      {ophtalmo.conduite_tenir && (
                        <div className="mt-1">
                          <span className="font-semibold text-green-800">CAT:</span> {ophtalmo.conduite_tenir}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
