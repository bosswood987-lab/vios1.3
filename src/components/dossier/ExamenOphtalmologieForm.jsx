
import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, AlertTriangle, ArrowRight, Sparkles, Activity, Calculator, Zap, Copy, Trash2 } from "lucide-react";
import { format, differenceInHours, isSameDay, differenceInYears } from "date-fns";
import toast from 'react-hot-toast'; // Added toast import

export default function ExamenOphtalmologieForm({ patientId, patient }) {
  const queryClient = useQueryClient();
  const [examenDuJour, setExamenDuJour] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showOHTS, setShowOHTS] = useState(false);
  const [showMunnerlyn, setShowMunnerlyn] = useState(false);
  
  const [ohtsData, setOhtsData] = useState({
    age: "",
    pio: "",
    pachymetrie: "",
    cup_disc_ratio: "",
    psd: ""
  });

  const [munnerlynDataOD, setMunnerlynDataOD] = useState({
    pachymetrie: "",
    equivalent_spherique: "",
    epaisseur_capot: "110",
    zone_optique: "6.5"
  });

  const [munnerlynDataOG, setMunnerlynDataOG] = useState({
    pachymetrie: "",
    equivalent_spherique: "",
    epaisseur_capot: "110",
    zone_optique: "6.5"
  });
  
  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { email: 'default@user.com', specialite: 'ophtalmologue' });
    };
    loadUser();
  }, []);

  // Permission logic: Only ophtalmologue and admin can edit examen ophtalmologique
  const canEdit = currentUser?.specialite === 'ophtalmologue' || 
                  currentUser?.specialite === 'admin';

  const initialFormData = {
    patient_id: patientId,
    date_examen: new Date().toISOString(),
    lampe_fente_od: "",
    lampe_fente_og: "",
    fond_oeil_od: "",
    fond_oeil_og: "",
    diagnostic: "",
    conduite_tenir: "",
    notes: ""
  };

  const [formData, setFormData] = useState(initialFormData);

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-ophtalmologie', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOphtalmologie.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
    initialData: [],
  });

  const dernierExamenPrecedent = examens.length > 1 ? examens[1] : null;

  const { data: examensOrtho } = useQuery({
    queryKey: ['examens-orthoptiste', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOrthoptiste.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
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

  const { data: megaRaccourcis } = useQuery({
    queryKey: ['mega-raccourcis'],
    queryFn: async () => {
      const all = await base44.entities.MegaRaccourci.list();
      return all.filter(r => r.is_global || r.created_by === currentUser?.email);
    },
    initialData: [],
    enabled: !!currentUser,
  });

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  useEffect(() => {
    if (showOHTS && patient && examensOrtho.length > 0) {
      const dernierExamen = examensOrtho[0];
      const age = patient.date_naissance ? differenceInYears(new Date(), new Date(patient.date_naissance)) : "";
      
      setOhtsData({
        age: age.toString(),
        pio: dernierExamen.pio_od || dernierExamen.pio_og || "",
        pachymetrie: dernierExamen.pachymetrie_od || dernierExamen.pachymetrie_og || "",
        cup_disc_ratio: "",
        psd: ""
      });
    }
  }, [showOHTS, patient, examensOrtho]);

  useEffect(() => {
    if (showMunnerlyn && examensOrtho.length > 0) {
      const dernierExamen = examensOrtho[0];
      
      let equivSphOD = "";
      if (dernierExamen.ref_subjective_od_sphere) {
        const sphere = parseFloat(dernierExamen.ref_subjective_od_sphere) || 0;
        const cylindre = parseFloat(dernierExamen.ref_subjective_od_cylindre) || 0;
        equivSphOD = (sphere + cylindre / 2).toFixed(2);
      }
      
      setMunnerlynDataOD({
        pachymetrie: dernierExamen.pachymetrie_od || "",
        equivalent_spherique: equivSphOD,
        epaisseur_capot: munnerlynDataOD.epaisseur_capot, 
        zone_optique: munnerlynDataOD.zone_optique 
      });

      let equivSphOG = "";
      if (dernierExamen.ref_subjective_og_sphere) {
        const sphere = parseFloat(dernierExamen.ref_subjective_og_sphere) || 0;
        const cylindre = parseFloat(dernierExamen.ref_subjective_og_cylindre) || 0;
        equivSphOG = (sphere + cylindre / 2).toFixed(2);
      }
      
      setMunnerlynDataOG({
        pachymetrie: dernierExamen.pachymetrie_og || "",
        equivalent_spherique: equivSphOG,
        epaisseur_capot: munnerlynDataOG.epaisseur_capot, 
        zone_optique: munnerlynDataOG.zone_optique 
      });
    }
  }, [showMunnerlyn, examensOrtho]);

  const calculerScoreOHTS = () => {
    const age = parseFloat(ohtsData.age) || 0;
    const pio = parseFloat(ohtsData.pio) || 0;
    const pachy = parseFloat(ohtsData.pachymetrie) || 0;
    const cupDisc = parseFloat(ohtsData.cup_disc_ratio) || 0;
    const psd = parseFloat(ohtsData.psd) || 0;

    let score = 0;
    
    if (age > 65) score += 2;
    else if (age > 55) score += 1;
    
    if (pio > 28) score += 3;
    else if (pio > 25) score += 2;
    else if (pio > 21) score += 1;
    
    if (pachy < 555 && pachy > 0) score += 3;
    else if (pachy < 588) score += 2; 
    else if (pachy < 600) score += 1;
    
    if (cupDisc > 0.5) score += 2;
    else if (cupDisc > 0.4) score += 1;
    
    if (psd > 2.5) score += 2;
    else if (psd > 2.0) score += 1;

    const risqueTotal = score;
    const pourcentageRisque5ans = Math.min(Math.round(score * 2.5), 50);

    return {
      score: risqueTotal,
      pourcentage: pourcentageRisque5ans,
      niveau: risqueTotal <= 3 ? "Faible" : risqueTotal <= 7 ? "Modéré" : "Élevé"
    };
  };

  const calculerMunnerlyn = (data) => {
    const S = Math.abs(parseFloat(data.equivalent_spherique) || 0);
    const D = parseFloat(data.zone_optique) || 0;
    const pachy = parseFloat(data.pachymetrie) || 0;
    const capot = parseFloat(data.epaisseur_capot) || 0;

    const ablation = (S * D * D) / 3;
    const litStromalResiduel = pachy - capot - ablation;
    const pta = pachy > 0 ? ((ablation / pachy) * 100) : 0;

    return {
      ablation: ablation.toFixed(0),
      litStromal: litStromalResiduel.toFixed(0),
      pta: pta.toFixed(1),
      securitaire: litStromalResiduel >= 300
    };
  };

  useEffect(() => {
    if (examens.length > 0) {
      const dernierExamen = examens[0];
      const dateExamen = new Date(dernierExamen.date_examen);
      const aujourdhui = new Date();
      
      if (isSameDay(dateExamen, aujourdhui)) {
        const heuresDiff = differenceInHours(aujourdhui, dateExamen);
        
        if (heuresDiff < 24) {
          setExamenDuJour(dernierExamen);
          const loadedData = {
            patient_id: patientId,
            date_examen: dernierExamen.date_examen,
            lampe_fente_od: dernierExamen.lampe_fente_od || "",
            lampe_fente_og: dernierExamen.lampe_fente_og || "",
            fond_oeil_od: dernierExamen.fond_oeil_od || "",
            fond_oeil_og: dernierExamen.fond_oeil_og || "",
            diagnostic: dernierExamen.diagnostic || "",
            conduite_tenir: dernierExamen.conduite_tenir || "",
            notes: dernierExamen.notes || ""
          };
          setFormData(loadedData);
          setIsReadOnly(false);
        } else {
          setIsReadOnly(true);
        }
      }
    }
  }, [examens, patientId]);

  const createExamenMutation = useMutation({
    mutationFn: (data) => base44.entities.ExamenOphtalmologie.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-ophtalmologie', patientId] });
    },
  });

  const updateExamenMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExamenOphtalmologie.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-ophtalmologie', patientId] });
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: (data) => base44.entities.Patient.update(patientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });

  useEffect(() => {
    const handleSave = async () => {
      if (!canEdit) return;
      
      if (examenDuJour) {
        await updateExamenMutation.mutateAsync({ id: examenDuJour.id, data: formData });
      } else {
        await createExamenMutation.mutateAsync(formData);
      }
    };

    window.addEventListener('dossier-save', handleSave);
    return () => window.removeEventListener('dossier-save', handleSave);
  }, [formData, examenDuJour, canEdit, createExamenMutation, updateExamenMutation]);

  useEffect(() => {
    const handleMegaRaccourci = (e) => {
      const megaRaccourci = e.detail;
      const updates = {};
      
      if (megaRaccourci.diagnostic) {
        updates.diagnostic = formData.diagnostic 
          ? formData.diagnostic + " " + megaRaccourci.diagnostic 
          : megaRaccourci.diagnostic;
      }
      
      if (megaRaccourci.conduite_tenir) {
        updates.conduite_tenir = formData.conduite_tenir 
          ? formData.conduite_tenir + " " + megaRaccourci.conduite_tenir 
          : megaRaccourci.conduite_tenir;
      }
      
      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    };

    window.addEventListener('mega-raccourci-applied', handleMegaRaccourci);
    return () => window.removeEventListener('mega-raccourci-applied', handleMegaRaccourci);
  }, [formData]);

  const handleChange = (field, value) => {
    if (!canEdit) return;
    setFormData({ ...formData, [field]: value });
  };

  const handleToggleIVT = (checked) => {
    if (!canEdit) return;
    updatePatientMutation.mutate({ suivi_ivt: checked });
  };

  const appliquerRaccourci = (field, texte) => {
    if (!canEdit) return;
    const newValue = formData[field] ? formData[field] + " " + texte : texte;
    handleChange(field, newValue);
  };

  const appliquerMegaRaccourci = (megaRaccourci) => {
    if (!canEdit) return;
    
    const updates = {};
    
    if (megaRaccourci.lampe_fente_od) {
      updates.lampe_fente_od = formData.lampe_fente_od 
        ? formData.lampe_fente_od + " " + megaRaccourci.lampe_fente_od 
        : megaRaccourci.lampe_fente_od;
    }
    
    if (megaRaccourci.lampe_fente_og) {
      updates.lampe_fente_og = formData.lampe_fente_og 
        ? formData.lampe_fente_og + " " + megaRaccourci.lampe_fente_og 
        : megaRaccourci.lampe_fente_og;
    }
    
    if (megaRaccourci.fond_oeil_od) {
      updates.fond_oeil_od = formData.fond_oeil_od 
        ? formData.fond_oeil_od + " " + megaRaccourci.fond_oeil_od 
        : megaRaccourci.fond_oeil_od;
    }
    
    if (megaRaccourci.fond_oeil_og) {
      updates.fond_oeil_og = formData.fond_oeil_og 
        ? formData.fond_oeil_og + " " + megaRaccourci.fond_oeil_og 
        : megaRaccourci.fond_oeil_og;
    }

    if (megaRaccourci.diagnostic) {
      updates.diagnostic = formData.diagnostic 
        ? formData.diagnostic + " " + megaRaccourci.diagnostic 
        : megaRaccourci.diagnostic;
    }
    
    if (megaRaccourci.conduite_tenir) {
      updates.conduite_tenir = formData.conduite_tenir 
        ? formData.conduite_tenir + " " + megaRaccourci.conduite_tenir 
        : megaRaccourci.conduite_tenir;
    }

    if (megaRaccourci.interpretation_imagerie) {
      window.dispatchEvent(new CustomEvent('mega-raccourci-applied', { 
        detail: megaRaccourci 
      }));
    }
    
    setFormData({ ...formData, ...updates });
  };

  const copierDernierExamen = () => {
    if (!dernierExamenPrecedent) {
      toast.error("Aucun examen précédent à copier");
      return;
    }

    setFormData(prev => ({
      ...prev,
      lampe_fente_od: dernierExamenPrecedent.lampe_fente_od || "",
      lampe_fente_og: dernierExamenPrecedent.lampe_fente_og || "",
      fond_oeil_od: dernierExamenPrecedent.fond_oeil_od || "",
      fond_oeil_og: dernierExamenPrecedent.fond_oeil_og || "",
      diagnostic: dernierExamenPrecedent.diagnostic || "",
      conduite_tenir: dernierExamenPrecedent.conduite_tenir || ""
    }));

    toast.success("Données copiées depuis le dernier examen");
  };

  const effacerChamp = (field) => {
    if (!canEdit) return;
    setFormData(prev => ({
      ...prev,
      [field]: ""
    }));
  };

  const raccourcisLampeFente = raccourcis.filter(r => r.categorie === 'lampe_fente');
  const raccourcisFondOeil = raccourcis.filter(r => r.categorie === 'fond_oeil');

  const nomAffichage = examenDuJour?.created_by 
    ? (() => {
        const user = users.find(u => u.email === examenDuJour.created_by);
        return user?.nom_affichage || user?.full_name || '';
      })()
    : '';

  if (isReadOnly) {
    return (
      <div className="space-y-3">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="ml-2 text-sm">
            Examen de plus de 24 heures - Lecture seule
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const scoreOHTS = showOHTS ? calculerScoreOHTS() : null;
  const resultMunnerlynOD = showMunnerlyn ? calculerMunnerlyn(munnerlynDataOD) : null;
  const resultMunnerlynOG = showMunnerlyn ? calculerMunnerlyn(munnerlynDataOG) : null;

  return (
    <div className="space-y-3 pb-4">
      {examenDuJour && (
        <Alert className="bg-blue-50 border-blue-200 py-2">
          <AlertDescription className="text-xs flex items-center justify-between">
            <span>
              Modification de l'examen du {format(new Date(examenDuJour.date_examen), 'dd/MM/yyyy à HH:mm')}
            </span>
            {nomAffichage && (
              <span className="font-semibold text-blue-700 text-base">
                Dr {nomAffichage}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {megaRaccourcis.length > 0 && canEdit && (
        <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Raccourcis
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-3">
            <div className="flex gap-2 flex-wrap">
              {megaRaccourcis.map((raccourci) => (
                <Button
                  key={raccourci.id}
                  size="sm"
                  variant="outline"
                  onClick={() => appliquerMegaRaccourci(raccourci)}
                  className="h-7 text-xs px-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 border-none"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  {raccourci.nom}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canEdit && dernierExamenPrecedent && (
        <div className="flex justify-end mb-2">
          <Button
            onClick={copierDernierExamen}
            variant="outline"
            size="sm"
            className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300"
          >
            <Copy className="w-4 h-4" />
            Copier dernier examen
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Examen ophtalmologique</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3">

          <Card className="border border-blue-200">
            <CardHeader className="bg-blue-50 py-2 px-3">
              <CardTitle className="text-sm">Lampe à fente</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Changed order to OD first */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">OD (Œil Droit)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => effacerChamp('lampe_fente_od')}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      disabled={!canEdit}
                      title="Effacer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={formData.lampe_fente_od}
                    onChange={(e) => handleChange('lampe_fente_od', e.target.value)}
                    rows={3}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">OG (Œil Gauche)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => effacerChamp('lampe_fente_og')}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      disabled={!canEdit}
                      title="Effacer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={formData.lampe_fente_og}
                    onChange={(e) => handleChange('lampe_fente_og', e.target.value)}
                    rows={3}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-red-200">
            <CardHeader className="bg-red-50 py-2 px-3">
              <CardTitle className="text-sm">Fond d'œil</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Changed order to OD first */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">OD (Œil Droit)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => effacerChamp('fond_oeil_od')}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      disabled={!canEdit}
                      title="Effacer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={formData.fond_oeil_od}
                    onChange={(e) => handleChange('fond_oeil_od', e.target.value)}
                    rows={3}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">OG (Œil Gauche)</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => effacerChamp('fond_oeil_og')}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                      disabled={!canEdit}
                      title="Effacer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <Textarea
                    value={formData.fond_oeil_og}
                    onChange={(e) => handleChange('fond_oeil_og', e.target.value)}
                    rows={3}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-green-200">
            <CardHeader className="bg-green-50 py-1 px-3">
              <CardTitle className="text-sm">Conclusion</CardTitle>
            </CardHeader>
            <CardContent className="py-2 px-3 space-y-2">
              <div>
                <Label className="text-xs">Diagnostic</Label>
                <Textarea
                  value={formData.diagnostic}
                  onChange={(e) => handleChange('diagnostic', e.target.value)}
                  rows={3}
                  placeholder="Diagnostic du patient..."
                  className="text-sm"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label className="text-xs">Conduite à tenir</Label>
                <Textarea
                  value={formData.conduite_tenir}
                  onChange={(e) => handleChange('conduite_tenir', e.target.value)}
                  rows={3}
                  placeholder="Traitement et suivi..."
                  className="text-sm"
                  disabled={!canEdit}
                />
              </div>

              {canEdit && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mt-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    <div>
                      <Label className="text-xs font-semibold text-blue-900">Suivi IVT</Label>
                      <p className="text-xs text-blue-700">Activer le suivi des injections intravitréennes</p>
                    </div>
                  </div>
                  <Switch
                    checked={patient?.suivi_ivt || false}
                    onCheckedChange={handleToggleIVT}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <Label className="text-xs">Notes additionnelles</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
              className="text-sm"
              disabled={!canEdit}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <div className="space-y-3 mt-4">
          <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-600" />
                  <CardTitle className="text-sm">Calculatrice OHTS</CardTitle>
                </div>
                <Switch
                  checked={showOHTS}
                  onCheckedChange={setShowOHTS}
                />
              </div>
            </CardHeader>
            {showOHTS && (
              <CardContent className="py-2 px-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Âge (ans)</Label>
                    <Input
                      type="number"
                      value={ohtsData.age}
                      onChange={(e) => setOhtsData(prev => ({...prev, age: e.target.value}))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">PIO (mmHg)</Label>
                    <Input
                      type="number"
                      value={ohtsData.pio}
                      onChange={(e) => setOhtsData(prev => ({...prev, pio: e.target.value}))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Pachymétrie (µm)</Label>
                    <Input
                      type="number"
                      value={ohtsData.pachymetrie}
                      onChange={(e) => setOhtsData(prev => ({...prev, pachymetrie: e.target.value}))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">C/D Ratio</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={ohtsData.cup_disc_ratio}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (e.target.value === '' || (!isNaN(val) && val >= 0)) {
                          setOhtsData(prev => ({...prev, cup_disc_ratio: e.target.value}));
                        }
                      }}
                      className="h-8 text-sm"
                      placeholder="0.3"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">PSD (dB)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={ohtsData.psd}
                      onChange={(e) => setOhtsData(prev => ({...prev, psd: e.target.value}))}
                      className="h-8 text-sm"
                      placeholder="2.0"
                    />
                  </div>
                </div>
                
                {scoreOHTS && (
                  <div className={`p-3 rounded-lg border-2 ${
                    scoreOHTS.niveau === "Faible" ? "bg-green-50 border-green-300" :
                    scoreOHTS.niveau === "Modéré" ? "bg-yellow-50 border-yellow-300" :
                    "bg-red-50 border-red-300"
                  }`}>
                    <p className="text-sm font-semibold">Risque de glaucome à 5 ans</p>
                    <p className="text-2xl font-bold">{scoreOHTS.pourcentage}%</p>
                    <p className="text-xs">Niveau: {scoreOHTS.niveau} (Score: {scoreOHTS.score}/12)</p>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          <Card className="border-2 border-cyan-200 bg-gradient-to-r from-cyan-50 to-blue-50">
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-600" />
                  <CardTitle className="text-sm">Formule de Munnerlyn (OD & OG)</CardTitle>
                </div>
                <Switch
                  checked={showMunnerlyn}
                  onCheckedChange={setShowMunnerlyn}
                />
              </div>
            </CardHeader>
            {showMunnerlyn && (
              <CardContent className="py-2 px-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-red-50">
                    <h4 className="font-semibold text-sm mb-2 text-orange-700">OD (Œil Droit)</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Pachymétrie (µm)</Label>
                          <Input
                            type="number"
                            value={munnerlynDataOD.pachymetrie}
                            onChange={(e) => setMunnerlynDataOD({...munnerlynDataOD, pachymetrie: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Équiv. sphérique (D)</Label>
                          <Input
                            type="number"
                            step="0.25"
                            value={munnerlynDataOD.equivalent_spherique}
                            onChange={(e) => setMunnerlynDataOD({...munnerlynDataOD, equivalent_spherique: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Capot (µm)</Label>
                          <Input
                            type="number"
                            value={munnerlynDataOD.epaisseur_capot}
                            onChange={(e) => setMunnerlynDataOD({...munnerlynDataOD, epaisseur_capot: e.target.value})}
                            className="h-8 text-sm"
                            placeholder="110"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Zone optique (mm)</Label>
                          <Select
                            value={munnerlynDataOD.zone_optique}
                            onValueChange={(value) => setMunnerlynDataOD({...munnerlynDataOD, zone_optique: value})}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5.0">5.0 mm</SelectItem>
                              <SelectItem value="5.5">5.5 mm</SelectItem>
                              <SelectItem value="6.0">6.0 mm</SelectItem>
                              <SelectItem value="6.5">6.5 mm</SelectItem>
                              <SelectItem value="7.0">7.0 mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {resultMunnerlynOD && (
                        <div className={`p-2 rounded border-2 ${
                          resultMunnerlynOD.securitaire ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                        }`}>
                          <div className="space-y-0.5 text-xs">
                            <p><strong>Ablation :</strong> {resultMunnerlynOD.ablation} µm</p>
                            <p><strong>Lit stromal résiduel :</strong> {resultMunnerlynOD.litStromal} µm</p>
                            <p><strong>PTA :</strong> {resultMunnerlynOD.pta} %</p>
                            <p className={`font-semibold ${resultMunnerlynOD.securitaire ? 'text-green-700' : 'text-red-700'}`}>
                              {resultMunnerlynOD.securitaire ? '✓ Sécuritaire' : '⚠ Risque ectasie'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
                    <h4 className="font-semibold text-sm mb-2 text-green-700">OG (Œil Gauche)</h4>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Pachymétrie (µm)</Label>
                          <Input
                            type="number"
                            value={munnerlynDataOG.pachymetrie}
                            onChange={(e) => setMunnerlynDataOG({...munnerlynDataOG, pachymetrie: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Équiv. sphérique (D)</Label>
                          <Input
                            type="number"
                            step="0.25"
                            value={munnerlynDataOG.equivalent_spherique}
                            onChange={(e) => setMunnerlynDataOG({...munnerlynDataOG, equivalent_spherique: e.target.value})}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Capot (µm)</Label>
                          <Input
                            type="number"
                            value={munnerlynDataOG.epaisseur_capot}
                            onChange={(e) => setMunnerlynDataOG({...munnerlynDataOG, epaisseur_capot: e.target.value})}
                            className="h-8 text-sm"
                            placeholder="110"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Zone optique (mm)</Label>
                          <Select
                            value={munnerlynDataOG.zone_optique}
                            onValueChange={(value) => setMunnerlynDataOG({...munnerlynDataOG, zone_optique: value})}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5.0">5.0 mm</SelectItem>
                              <SelectItem value="5.5">5.5 mm</SelectItem>
                              <SelectItem value="6.0">6.0 mm</SelectItem>
                              <SelectItem value="6.5">6.5 mm</SelectItem>
                              <SelectItem value="7.0">7.0 mm</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      {resultMunnerlynOG && (
                        <div className={`p-2 rounded border-2 ${
                          resultMunnerlynOG.securitaire ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"
                        }`}>
                          <div className="space-y-0.5 text-xs">
                            <p><strong>Ablation :</strong> {resultMunnerlynOG.ablation} µm</p>
                            <p><strong>Lit stromal résiduel :</strong> {resultMunnerlynOG.litStromal} µm</p>
                            <p><strong>PTA :</strong> {resultMunnerlynOG.pta} %</p>
                            <p className={`font-semibold ${resultMunnerlynOG.securitaire ? 'text-green-700' : 'text-red-700'}`}>
                              {resultMunnerlynOG.securitaire ? '✓ Sécuritaire' : '⚠ Risque ectasie'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
