
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Glasses, AlertTriangle, Printer, Copy, Trash2, Edit, RefreshCw, Mail, Plus } from "lucide-react";
import { format, differenceInHours, isSameDay } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { genererPdfEtOuvrirEmail } from "./PdfEmailHelper";

export default function ExamenOrthoptisteForm({ patientId, patient }) {
  const queryClient = useQueryClient();
  const [examenDuJour, setExamenDuJour] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showOrdonnanceLunetteDialog, setShowOrdonnanceLunetteDialog] = useState(false);
  const [currentExamenIndex, setCurrentExamenIndex] = useState(0);
  const [examensAujourdhui, setExamensAujourdhui] = useState([]);
  const [ordonnanceLunetteData, setOrdonnanceLunetteData] = useState({
    type_vision: "Vision de loin",
    type_verres: "",
    type_teinte: ""
  });
  const [editingVerre, setEditingVerre] = useState(null);

  const [prescriptionVerres, setPrescriptionVerres] = useState({
    od_sphere: "",
    od_cylindre: "",
    od_axe: "",
    od_addition: "",
    og_sphere: "",
    og_cylindre: "",
    og_axe: "",
    og_addition: ""
  });

  const [cylindrePositif, setCylindrePositif] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { email: 'default@user.com', specialite: 'ophtalmologue' });
    };
    loadUser();
  }, []);

  // Permission logic based on user specialite
  const canEdit = currentUser?.specialite === 'orthoptiste' || 
                  currentUser?.specialite === 'ophtalmologue' || 
                  currentUser?.specialite === 'admin';
  const canEditPrescription = currentUser?.specialite === 'ophtalmologue' || 
                              currentUser?.specialite === 'admin';
  const canPrintOrEmail = true; // Everyone can print/email

  const initialFormData = {
    patient_id: patientId,
    date_examen: new Date().toISOString(),
    motif_consultation: "",
    allergie: "",
    atcd_med: "",
    atcd_oph: "",
    pio_od: "",
    pio_og: "",
    pachymetrie_od: "",
    pachymetrie_og: "",
    pio_corrige_od: "",
    pio_corrige_og: "",
    keratometrie_od_k1: "",
    keratometrie_od_k1_axe: "",
    keratometrie_od_k2: "",
    keratometrie_od_k2_axe: "",
    keratometrie_od_km: "",
    keratometrie_od_km_axe: "",
    keratometrie_og_k1: "",
    keratometrie_og_k1_axe: "",
    keratometrie_og_k2: "",
    keratometrie_og_k2_axe: "",
    keratometrie_og_km: "",
    keratometrie_og_km_axe: "",
    lunettes_portees_od_sphere: "",
    lunettes_portees_od_cylindre: "",
    lunettes_portees_od_axe: "",
    lunettes_portees_od_av: "",
    lunettes_portees_og_sphere: "",
    lunettes_portees_og_cylindre: "",
    lunettes_portees_og_axe: "",
    lunettes_portees_og_av: "",
    autoref_od_sphere: "",
    autoref_od_cylindre: "",
    autoref_od_axe: "",
    autoref_og_sphere: "",
    autoref_og_cylindre: "",
    autoref_og_axe: "",
    pd: "",
    ps_od: "",
    ps_og: "",
    ref_subjective_sous_skiacol: false,
    ref_subjective_od_sphere: "",
    ref_subjective_od_cylindre: "",
    ref_subjective_od_axe: "",
    ref_subjective_od_avl: "",
    ref_subjective_od_add: "",
    ref_subjective_od_avp: "",
    ref_subjective_og_sphere: "",
    ref_subjective_og_cylindre: "",
    ref_subjective_og_axe: "",
    ref_subjective_og_avl: "",
    ref_subjective_og_add: "",
    ref_subjective_og_avp: "",
    examen_motilite: "",
    convergence: "",
    phories: "",
    tropies: "",
    notes: ""
  };

  const [formData, setFormData] = useState(() => ({
    ...initialFormData
  }));

  const calculerRayonCourbure = (dioptrie) => {
    if (!dioptrie) return "";
    const d = parseFloat(dioptrie);
    if (isNaN(d) || d === 0) return "";
    const r = 337.5 / d;
    return r.toFixed(2);
  };

  const calculerKM = (k1, k2) => {
    if (!k1 || !k2) return "";
    const k1Val = parseFloat(k1);
    const k2Val = parseFloat(k2);
    if (isNaN(k1Val) || isNaN(k2Val)) return "";
    return ((k1Val + k2Val) / 2).toFixed(2);
  };

  const calculerCylindreCorneenFinal = (k2, k1) => {
    if (!k1 || !k2) return "";
    const k1Val = parseFloat(k1);
    const k2Val = parseFloat(k2);
    if (isNaN(k1Val) || isNaN(k2Val)) return "";
    return (k2Val - k1Val).toFixed(2);
  };

  const handleNumericChange = (field, value) => {
    const regex = /^[0-9+\-./]*$/;
    if (regex.test(value) || value === '') {
      handleChange(field, value);
    }
  };

  const { data: examens, isLoading } = useQuery({
    queryKey: ['examens-orthoptiste', patientId],
    queryFn: async () => {
      const allExamens = await base44.entities.ExamenOrthoptiste.list('-date_examen');
      return allExamens.filter(e => e.patient_id === patientId);
    },
    initialData: [],
  });

  // Helper to map examen object to formData
  const mapExamenToFormData = (examen, pId) => ({
    patient_id: pId,
    date_examen: examen.date_examen,
    motif_consultation: examen.motif_consultation || "",
    allergie: examen.allergie || "",
    atcd_med: examen.atcd_med || "",
    atcd_oph: examen.atcd_oph || "",
    pio_od: examen.pio_od || "",
    pio_og: examen.pio_og || "",
    pachymetrie_od: examen.pachymetrie_od || "",
    pachymetrie_og: examen.pachymetrie_og || "",
    pio_corrige_od: examen.pio_corrige_od || "",
    pio_corrige_og: examen.pio_corrige_og || "",
    keratometrie_od_k1: examen.keratometrie_od_k1 || "",
    keratometrie_od_k1_axe: examen.keratometrie_od_k1_axe || "",
    keratometrie_od_k2: examen.keratometrie_od_k2 || "",
    keratometrie_od_k2_axe: examen.keratometrie_od_k2_axe || "",
    keratometrie_od_km: examen.keratometrie_od_km || "",
    keratometrie_od_km_axe: examen.keratometrie_od_km_axe || "",
    keratometrie_og_k1: examen.keratometrie_og_k1 || "",
    keratometrie_og_k1_axe: examen.keratometrie_og_k1_axe || "",
    keratometrie_og_k2: examen.keratometrie_og_k2 || "",
    keratometrie_og_k2_axe: examen.keratometrie_og_k2_axe || "",
    keratometrie_og_km: examen.keratometrie_og_km || "",
    keratometrie_og_km_axe: examen.keratometrie_og_km_axe || "",
    lunettes_portees_od_sphere: examen.lunettes_portees_od_sphere || "",
    lunettes_portees_od_cylindre: examen.lunettes_portees_od_cylindre || "",
    lunettes_portees_od_axe: examen.lunettes_portees_od_axe || "",
    lunettes_portees_od_av: examen.lunettes_portees_od_av || "",
    lunettes_portees_og_sphere: examen.lunettes_portees_og_sphere || "",
    lunettes_portees_og_cylindre: examen.lunettes_portees_og_cylindre || "",
    lunettes_portees_og_axe: examen.lunettes_portees_og_axe || "",
    lunettes_portees_og_av: examen.lunettes_portees_og_av || "",
    autoref_od_sphere: examen.autoref_od_sphere || "",
    autoref_od_cylindre: examen.autoref_od_cylindre || "",
    autoref_od_axe: examen.autoref_od_axe || "",
    autoref_og_sphere: examen.autoref_og_sphere || "",
    autoref_og_cylindre: examen.autoref_og_cylindre || "",
    autoref_og_axe: examen.autoref_og_axe || "",
    pd: examen.pd || "",
    ps_od: examen.ps_od || "",
    ps_og: examen.ps_og || "",
    ref_subjective_sous_skiacol: examen.ref_subjective_sous_skiacol || false,
    ref_subjective_od_sphere: examen.ref_subjective_od_sphere || "",
    ref_subjective_od_cylindre: examen.ref_subjective_od_cylindre || "",
    ref_subjective_od_axe: examen.ref_subjective_od_axe || "",
    ref_subjective_od_avl: examen.ref_subjective_od_avl || "",
    ref_subjective_od_add: examen.ref_subjective_od_add || "",
    ref_subjective_od_avp: examen.ref_subjective_od_avp || "",
    ref_subjective_og_sphere: examen.ref_subjective_og_sphere || "",
    ref_subjective_og_cylindre: examen.ref_subjective_og_cylindre || "",
    ref_subjective_og_axe: examen.ref_subjective_og_axe || "",
    ref_subjective_og_avl: examen.ref_subjective_og_avl || "",
    ref_subjective_og_add: examen.ref_subjective_og_add || "",
    ref_subjective_og_avp: examen.ref_subjective_og_avp || "",
    examen_motilite: examen.examen_motilite || "",
    convergence: examen.convergence || "",
    phories: examen.phories || "",
    tropies: examen.tropies || "",
    notes: examen.notes || ""
  });


  useEffect(() => {
    if (!isLoading && examens) {
      const aujourdhui = new Date();
      const filteredExamensJour = examens.filter(ex => {
        const dateEx = new Date(ex.date_examen);
        return isSameDay(dateEx, aujourdhui);
      });

      // Sort by date_examen descending to ensure examensJour[0] is the latest for today
      filteredExamensJour.sort((a, b) => new Date(b.date_examen).getTime() - new Date(a.date_examen).getTime());

      setExamensAujourdhui(filteredExamensJour);

      if (filteredExamensJour.length > 0) {
        // If there are exams for today, load the latest one
        const latestExamenToday = filteredExamensJour[0];
        setExamenDuJour(latestExamenToday);
        setCurrentExamenIndex(0); // Select the latest one
        setFormData(mapExamenToFormData(latestExamenToday, patientId));
        setIsReadOnly(false);
      } else {
        // No exams for today, but the user can create one.
        setExamenDuJour(null); // No exam being *edited* for today yet
        setFormData(initialFormData); // Start with a blank form for a *new* exam
        setIsReadOnly(false); // Allow user to fill out a new exam
      }
    }
  }, [examens, patientId, isLoading]);

  const dernierExamenPrecedent = examensAujourdhui.length > 0
    ? (examens.find(ex => !isSameDay(new Date(ex.date_examen), new Date())) || null)
    : (examens.length > 0 ? examens[0] : null);


  const { data: verresPrescrit } = useQuery({
    queryKey: ['verres-prescrit', patientId],
    queryFn: async () => {
      const allVerres = await base44.entities.VerresPrescrit.list('-date_prescription');
      return allVerres.filter(v => v.patient_id === patientId);
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

  const { data: users } = useQuery({
    queryKey: ['users-for-print'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const createExamenMutation = useMutation({
    mutationFn: (data) => base44.entities.ExamenOrthoptiste.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-orthoptiste', patientId] });
    },
  });

  const updateExamenMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExamenOrthoptiste.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['examens-orthoptiste', patientId] });
    },
  });

  const createVerresPrescritMutation = useMutation({
    mutationFn: (data) => base44.entities.VerresPrescrit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verres-prescrit', patientId] });
      setShowOrdonnanceLunetteDialog(false);
      setOrdonnanceLunetteData({
        type_vision: "Vision de loin",
        type_verres: "",
        type_teinte: ""
      });
      setEditingVerre(null);
    },
  });

  const updateVerresPrescritMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VerresPrescrit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verres-prescrit', patientId] });
      setShowOrdonnanceLunetteDialog(false);
      setOrdonnanceLunetteData({
        type_vision: "Vision de loin",
        type_verres: "",
        type_teinte: ""
      });
      setEditingVerre(null);
    },
  });

  const deleteVerresPrescritMutation = useMutation({
    mutationFn: (id) => base44.entities.VerresPrescrit.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verres-prescrit', patientId] });
    },
  });

  useEffect(() => {
    const handleSaveEvent = async () => {
      if (!canEdit) return;

      const dataToSave = {
        ...formData,
        patient_id: patientId, // Ensure patient_id is always set
        date_examen: examenDuJour ? examenDuJour.date_examen : new Date().toISOString() // Use existing date if updating, else new date
      };

      if (examenDuJour && examenDuJour.id) { // If examenDuJour exists, it means we are updating an existing one
        await updateExamenMutation.mutateAsync({ id: examenDuJour.id, data: dataToSave });
        toast.success("Examen mis à jour !");
      } else { // No examenDuJour, so create a new one (this happens if no exams for today when form is first loaded)
        const createdExamen = await createExamenMutation.mutateAsync(dataToSave);
        queryClient.invalidateQueries({ queryKey: ['examens-orthoptiste', patientId] }); // Invalidate to refetch and update UI
        toast.success("Nouvel examen créé !");
      }
    };

    window.addEventListener('dossier-save', handleSaveEvent);
    return () => window.removeEventListener('dossier-save', handleSaveEvent);
  }, [formData, examenDuJour, canEdit, patientId, createExamenMutation, updateExamenMutation, queryClient]);

  const handleChange = (field, value) => {
    if (!canEdit) return;
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value,
        patient_id: prev.patient_id || patientId,
        date_examen: prev.date_examen || new Date().toISOString()
      };

      if (field === 'keratometrie_od_k1' || field === 'keratometrie_od_k2') {
        const k1 = field === 'keratometrie_od_k1' ? value : prev.keratometrie_od_k1;
        const k2 = field === 'keratometrie_od_k2' ? value : prev.keratometrie_od_k2;
        newData.keratometrie_od_km = calculerKM(k1, k2);
      }

      if (field === 'keratometrie_og_k1' || field === 'keratometrie_og_k2') {
        const k1 = field === 'keratometrie_og_k1' ? value : prev.keratometrie_og_k1;
        const k2 = field === 'keratometrie_og_k2' ? value : prev.keratometrie_og_k2;
        newData.keratometrie_og_km = calculerKM(k1, k2);
      }

      return newData;
    });
  };

  const appliquerRaccourci = (field, texte) => {
    if (!canEdit) return;
    const newValue = formData[field] ? formData[field] + " " + texte : texte;
    handleChange(field, newValue);
  };

  const copierRefractionSubjective = () => {
    setPrescriptionVerres({
      od_sphere: formData.ref_subjective_od_sphere,
      od_cylindre: formData.ref_subjective_od_cylindre,
      od_axe: formData.ref_subjective_od_axe,
      od_addition: formData.ref_subjective_od_add,
      og_sphere: formData.ref_subjective_og_sphere,
      og_cylindre: formData.ref_subjective_og_cylindre,
      og_axe: formData.ref_subjective_og_axe,
      og_addition: formData.ref_subjective_og_add
    });
  };

  const convertirCylindre = () => {
    const convertirOeil = (sphere, cylindre, axe) => {
      if (!cylindre || parseFloat(cylindre) === 0) return { sphere, cylindre, axe };

      const sph = parseFloat(sphere) || 0;
      const cyl = parseFloat(cylindre);
      const ax = parseFloat(axe) || 0;

      if (isNaN(sph) || isNaN(cyl) || isNaN(ax)) return { sphere, cylindre, axe };

      const newCyl = -cyl;
      const newSph = sph + cyl;
      let newAxe = (ax + 90) % 180;
      if (newAxe === 0) newAxe = 180; // Axis 0 is usually represented as 180

      return {
        sphere: newSph.toFixed(2),
        cylindre: newCyl.toFixed(2),
        axe: newAxe.toString()
      };
    };

    const odConverted = convertirOeil(prescriptionVerres.od_sphere, prescriptionVerres.od_cylindre, prescriptionVerres.od_axe);
    const ogConverted = convertirOeil(prescriptionVerres.og_sphere, prescriptionVerres.og_cylindre, prescriptionVerres.og_axe);

    setPrescriptionVerres(prev => ({
      ...prev,
      od_sphere: odConverted.sphere,
      od_cylindre: odConverted.cylindre,
      od_axe: odConverted.axe,
      og_sphere: ogConverted.sphere,
      og_cylindre: ogConverted.cylindre,
      og_axe: ogConverted.axe,
    }));

    setCylindrePositif(prev => !prev);
  };

  const handleImprimerOrdonnanceLunettes = () => {
    setOrdonnanceLunetteData({
      type_vision: "Vision de loin",
      type_verres: "",
      type_teinte: ""
    });
    setPrescriptionVerres({
      od_sphere: formData.ref_subjective_od_sphere,
      od_cylindre: formData.ref_subjective_od_cylindre,
      od_axe: formData.ref_subjective_od_axe,
      od_addition: formData.ref_subjective_od_add,
      og_sphere: formData.ref_subjective_og_sphere,
      og_cylindre: formData.ref_subjective_og_cylindre,
      og_axe: formData.ref_subjective_og_axe,
      og_addition: formData.ref_subjective_og_add
    });
    setCylindrePositif(false); // Reset cylinder sign on new ordonnance
    setEditingVerre(null);
    setShowOrdonnanceLunetteDialog(true);
  };

  const handleModifierEtImprimer = (verre) => {
    setPrescriptionVerres({
      od_sphere: verre.od_sphere || "",
      od_cylindre: verre.od_cylindre || "",
      od_axe: verre.od_axe || "",
      od_addition: verre.od_addition || "",
      og_sphere: verre.og_sphere || "",
      og_cylindre: verre.og_cylindre || "",
      og_axe: verre.og_axe || "",
      og_addition: verre.og_addition || ""
    });
    setOrdonnanceLunetteData({
      type_vision: verre.type_vision || "Vision de loin",
      type_verres: verre.type_verres || "",
      type_teinte: verre.type_teinte || "",
      notes: verre.notes || ""
    });
    setCylindrePositif(false); // Assume prescriptions are stored in negative cylinder form.
    setEditingVerre(verre);
    setShowOrdonnanceLunetteDialog(true);
  };

  const handleRenouveler = async (verre) => {
    if (!canEditPrescription) return;

    const nouvelleOrdonnance = {
      patient_id: patientId,
      date_prescription: new Date().toISOString(),
      type_vision: verre.type_vision,
      type_verres: verre.type_verres,
      type_teinte: verre.type_teinte,
      od_sphere: verre.od_sphere,
      od_cylindre: verre.od_cylindre,
      od_axe: verre.od_axe,
      od_addition: verre.od_addition,
      og_sphere: verre.og_sphere,
      og_cylindre: verre.og_cylindre,
      og_axe: verre.og_axe,
      og_addition: verre.og_addition,
      notes: verre.notes
    };

    await createVerresPrescritMutation.mutateAsync(nouvelleOrdonnance);
    setTimeout(() => {
      imprimerOrdonnance(nouvelleOrdonnance);
    }, 300);
  };

  const handleCreerOrdonnanceLunette = async (etImprimer = false) => {
    if (!canEditPrescription) return;

    let od_sphere_final = prescriptionVerres.od_sphere;
    let og_sphere_final = prescriptionVerres.og_sphere;
    let od_addition_final = prescriptionVerres.od_addition;
    let og_addition_final = prescriptionVerres.og_addition;

    if (ordonnanceLunetteData.type_vision === "Vision de près") {
      const od_sph = parseFloat(prescriptionVerres.od_sphere) || 0;
      const od_add = parseFloat(prescriptionVerres.od_addition) || 0;
      const og_sph = parseFloat(prescriptionVerres.og_sphere) || 0;
      const og_add = parseFloat(prescriptionVerres.og_addition) || 0;

      od_sphere_final = (od_sph + od_add).toFixed(2);
      og_sphere_final = (og_sph + og_add).toFixed(2);
      od_addition_final = "";
      og_addition_final = "";
    }

    const verresData = {
      patient_id: patientId,
      date_prescription: new Date().toISOString(),
      type_vision: ordonnanceLunetteData.type_vision,
      type_verres: ordonnanceLunetteData.type_verres,
      type_teinte: ordonnanceLunetteData.type_teinte,
      od_sphere: od_sphere_final,
      od_cylindre: prescriptionVerres.od_cylindre,
      od_axe: prescriptionVerres.od_axe,
      od_addition: od_addition_final,
      og_sphere: og_sphere_final,
      og_cylindre: prescriptionVerres.og_cylindre,
      og_axe: prescriptionVerres.og_axe,
      og_addition: og_addition_final,
      notes: ordonnanceLunetteData.notes || ""
    };

    if (editingVerre) {
      await updateVerresPrescritMutation.mutateAsync({ id: editingVerre.id, data: verresData });
    } else {
      await createVerresPrescritMutation.mutateAsync(verresData);
    }

    if (etImprimer) {
      setTimeout(() => {
        imprimerOrdonnance(verresData);
      }, 300);
    }
  };

  const genererHtmlOrdonnance = (verre) => {
    const medecin = users.find(u => u.specialite === 'admin' || u.specialite === 'ophtalmologue') || currentUser;
    const entete = medecin?.entete_ordonnance || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Ordonnance de lunettes - ${patient.prenom} ${patient.nom}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
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
          .prescription {
            margin: 30px 0;
          }
          .prescription-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .prescription-table th,
          .prescription-table td {
            border: 1px solid #333;
            padding: 12px;
            text-align: center;
          }
          .prescription-table th {
            background-color: #e0e0e0;
            font-weight: bold;
          }
          .info-section {
            margin: 20px 0;
            padding: 15px;
            background-color: #f9f9f9;
            border-left: 4px solid #666;
          }
          .footer {
            margin-top: 50px;
            text-align: right;
          }
          .signature {
            margin-top: 60px;
            text-align: right;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${entete ? `<img src="${entete}" alt="En-tête" style="max-width: 100%; height: auto;" />` : '<p style="text-align: center; font-size: 18px; font-weight: bold;">Cabinet d\'Ophtalmologie</p>'}
        </div>

        <div class="title">Ordonnance de lunettes</div>

        <div class="patient-info">
          <p><strong>Patient(e) :</strong> ${patient.prenom} ${patient.nom}</p>
          ${patient.date_naissance ? `<p><strong>Date de naissance :</strong> ${format(new Date(patient.date_naissance), 'dd/MM/yyyy')}</p>` : ''}
          <p><strong>Date :</strong> ${format(new Date(), 'dd/MM/yyyy')}</p>
        </div>

        <div class="prescription">
          <h3>Prescription</h3>

          <div class="info-section">
            <p><strong>Type de vision :</strong> ${verre.type_vision || 'Vision de loin'}</p>
            ${verre.type_verres ? `<p><strong>Type de verres :</strong> ${verre.type_verres}</p>` : ''}
            ${verre.type_teinte ? `<p><strong>Teinte :</strong> ${verre.type_teinte}</p>` : ''}
          </div>

          <table class="prescription-table">
            <thead>
              <tr>
                <th>Œil</th>
                <th>Sphère</th>
                <th>Cylindre</th>
                <th>Axe</th>
                ${(verre.od_addition || verre.og_addition) && verre.type_vision !== "Vision de près" ? '<th>Addition</th>' : ''}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>OD (Œil Droit)</strong></td>
                <td>${verre.od_sphere || '—'}</td>
                <td>${verre.od_cylindre || '—'}</td>
                <td>${verre.od_axe ? verre.od_axe + '°' : '—'}</td>
                ${(verre.od_addition || verre.og_addition) && verre.type_vision !== "Vision de près" ? `<td>${verre.od_addition || '—'}</td>` : ''}
              </tr>
              <tr>
                <td><strong>OG (Œil Gauche)</strong></td>
                <td>${verre.og_sphere || '—'}</td>
                <td>${verre.og_cylindre || '—'}</td>
                <td>${verre.og_axe ? verre.og_axe + '°' : '—'}</td>
                ${(verre.od_addition || verre.og_addition) && verre.type_vision !== "Vision de près" ? `<td>${verre.og_addition || '—'}</td>` : ''}
              </tr>
            </tbody>
          </table>

          ${verre.notes ? `
            <div class="info-section">
              <p>${verre.notes}</p>
            </div>
          ` : ''}
        </div>

        <div class="signature">
          <p>Le ${format(new Date(), 'dd/MM/yyyy')}</p>
          ${medecin?.signature_image_url ? `<img src="${medecin.signature_image_url}" alt="Signature" style="max-width: 200px; margin-top: 10px;" />` : '<p style="margin-top: 60px; border-top: 1px solid #000; display: inline-block; padding-top: 5px;">Signature</p>'}
        </div>
      </body>
      </html>
    `;
  };

  const imprimerOrdonnance = (verre) => {
    const htmlContent = genererHtmlOrdonnance(verre);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDeleteVerres = (verre) => {
    if (!canEditPrescription) return;

    const datePrescription = new Date(verre.date_prescription);
    const maintenant = new Date();
    const differenceHeures = (maintenant - datePrescription) / (1000 * 60 * 60);

    if (differenceHeures > 24) {
      toast.error("Impossible de supprimer une prescription de plus de 24 heures");
      return;
    }

    if (confirm('Voulez-vous vraiment supprimer cette prescription de verres ?')) {
      deleteVerresPrescritMutation.mutate(verre.id);
    }
  };

  const handleEnvoyerEmail = async (verre) => {
    if (!patient.email) {
      toast.error("Le patient n'a pas d'adresse email renseignée");
      return;
    }

    const messagePersonnalise = currentUser?.message_email_pdf || "Bonjour,\n\nVous trouverez ci-joint votre ordonnance de lunettes.\n\nCordialement,";

    const htmlContent = genererHtmlOrdonnance(verre);
    const sujet = `Ordonnance de lunettes - ${patient.prenom} ${patient.nom}`;
    const nomFichier = `Ordonnance_Lunettes_${patient.nom}_${patient.prenom}_${format(new Date(), 'yyyyMMdd')}`;

    await genererPdfEtOuvrirEmail(htmlContent, patient.email, sujet, nomFichier, messagePersonnalise);
  };

  const isPIOAnormal = (pio) => {
    if (!pio) return false;
    const val = parseFloat(pio);
    return !isNaN(val) && val > 21;
  };

  const isPachyAnormal = (pachy) => {
    if (!pachy) return false;
    const val = parseFloat(pachy);
    return !isNaN(val) && (val < 510 || val > 600);
  };

  const isAVAnormal = (av) => {
    if (!av) return false;
    if (["PL+", "PL-", "VBLM", "CLD"].includes(av)) {
      return true;
    }
    const match = av.match(/(\d+\.?\d*)\/(\d+)/);
    if (match) {
      const [_, num, den] = match;
      return parseFloat(num) / parseFloat(den) < 1;
    }
    return false;
  };

  const raccourcisMotif = raccourcis.filter(r => r.categorie === 'motif_consultation');
  const raccourcisAllergie = raccourcis.filter(r => r.categorie === 'allergie');
  const raccourcisAtcdMed = raccourcis.filter(r => r.categorie === 'atcd_med');
  const raccourcisAtcdOph = raccourcis.filter(r => r.categorie === 'atcd_oph');
  const raccourcisMotilite = raccourcis.filter(r => r.categorie === 'motilite');

  const echelleAcuiteVisuelle = [
    "12/10", "10/10", "8/10", "6/10", "5/10", "4/10", "3/10", "2/10", "1/10", "0.5/10",
    "CLD", "VBLM", "PL+", "PL-"
  ];

  const echelleParinaud = ["P2", "P3", "P4", "P5", "P6", "P8", "P10", "P14", "P20"];

  const nomAffichage = examenDuJour?.created_by
    ? (() => {
      const user = users.find(u => u.email === examenDuJour.created_by);
      if (user?.nom_affichage) return user.nom_affichage;
      if (user?.full_name) {
        const parts = user.full_name.split(' ');
        return parts.map(p => p.charAt(0).toUpperCase()).join('');
      }
      return '';
    })()
    : '';

  const handleCreerNouvelExamen = async () => {
    if (!canEdit) return;

    if (examensAujourdhui.length >= 2) {
      toast.error("Maximum 2 examens par jour autorisés");
      return;
    }

    const nouvelExamen = {
      patient_id: patientId,
      date_examen: new Date().toISOString(),
      ref_subjective_sous_skiacol: false,
      motif_consultation: "",
      notes: ""
    };

    await createExamenMutation.mutateAsync(nouvelExamen, {
      onSuccess: () => {
        toast.success("Nouvel examen créé pour aujourd'hui !");
        // Invalidate and refetch to update the list of exams and automatically select the new one
        queryClient.invalidateQueries({ queryKey: ['examens-orthoptiste', patientId] });
      }
    });
  };

  const switchExamen = (index) => {
    if (examensAujourdhui[index]) {
      const examen = examensAujourdhui[index];
      setExamenDuJour(examen);
      setCurrentExamenIndex(index);
      setFormData(mapExamenToFormData(examen, patientId));
      setIsReadOnly(false); // Always editable if it's an exam from today
    }
  };


  if (isReadOnly && examensAujourdhui.length === 0) { // Only show read-only if no exams for today AND previous exams are > 24h
    return (
      <div className="space-y-3">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="ml-2 text-sm">
            Examen de plus de 24 heures - Lecture seule. Créez un nouvel examen pour commencer.
          </AlertDescription>
        </Alert>
        {canEdit && (
          <Button
            onClick={handleCreerNouvelExamen}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un nouvel examen
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {examenDuJour && (
        <Alert className="bg-blue-50 border-blue-200 py-2">
          <AlertDescription className="text-xs">
            <div className="flex items-center justify-between mb-2">
              <span>
                Modification de l'examen du {format(new Date(examenDuJour.date_examen), 'dd/MM/yyyy à HH:mm')}
              </span>
              {nomAffichage && (
                <span className="font-semibold text-blue-700">
                  {nomAffichage}
                </span>
              )}
            </div>
            {examensAujourdhui.length > 0 && (
              <div className="flex items-center gap-2">
                {examensAujourdhui.map((ex, idx) => (
                  <Button
                    key={ex.id}
                    variant={currentExamenIndex === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => switchExamen(idx)}
                    className="h-7 text-xs"
                  >
                    Examen {idx + 1}
                  </Button>
                ))}
                {canEdit && examensAujourdhui.length < 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCreerNouvelExamen}
                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Créer un nouvel examen (max 2)"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Examen orthoptiste</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3">

          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs">Motif de consultation</Label>
              {raccourcisMotif.length > 0 && canEdit && (
                <div className="flex gap-1 flex-wrap">
                  {raccourcisMotif.map((raccourci) => (
                    <Button
                      key={raccourci.id}
                      size="sm"
                      variant="outline"
                      onClick={() => appliquerRaccourci('motif_consultation', raccourci.texte)}
                      className="h-6 text-xs px-2"
                      disabled={!canEdit}
                    >
                      {raccourci.nom}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <Textarea
              value={formData.motif_consultation}
              onChange={(e) => handleChange('motif_consultation', e.target.value)}
              rows={2}
              className="text-sm"
              disabled={!canEdit}
            />
            <div className="mt-1">
              <Textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={1}
                className="text-xs"
                placeholder="Notes..."
                disabled={!canEdit}
              />
            </div>
          </div>

          {currentExamenIndex === 0 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">Allergie</Label>
                    {raccourcisAllergie.length > 0 && canEdit && (
                      <div className="flex gap-1 flex-wrap">
                        {raccourcisAllergie.map((raccourci) => (
                          <Button
                            key={raccourci.id}
                            size="sm"
                            variant="outline"
                            onClick={() => appliquerRaccourci('allergie', raccourci.texte)}
                            className="h-5 text-xs px-1.5"
                            disabled={!canEdit}
                          >
                            {raccourci.nom}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={formData.allergie}
                    onChange={(e) => handleChange('allergie', e.target.value)}
                    rows={1}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">ATCD Médicaux</Label>
                    {raccourcisAtcdMed.length > 0 && canEdit && (
                      <div className="flex gap-1 flex-wrap">
                        {raccourcisAtcdMed.map((raccourci) => (
                          <Button
                            key={raccourci.id}
                            size="sm"
                            variant="outline"
                            onClick={() => appliquerRaccourci('atcd_med', raccourci.texte)}
                            className="h-5 text-xs px-1.5"
                            disabled={!canEdit}
                          >
                            {raccourci.nom}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={formData.atcd_med}
                    onChange={(e) => handleChange('atcd_med', e.target.value)}
                    rows={1}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs">ATCD Ophtalmologiques</Label>
                    {raccourcisAtcdOph.length > 0 && canEdit && (
                      <div className="flex gap-1 flex-wrap">
                        {raccourcisAtcdOph.map((raccourci) => (
                          <Button
                            key={raccourci.id}
                            size="sm"
                            variant="outline"
                            onClick={() => appliquerRaccourci('atcd_oph', raccourci.texte)}
                            className="h-5 text-xs px-1.5"
                            disabled={!canEdit}
                          >
                            {raccourci.nom}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={formData.atcd_oph}
                    onChange={(e) => handleChange('atcd_oph', e.target.value)}
                    rows={1}
                    className="text-sm"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <Card className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card className="border">
                  <CardHeader className="bg-blue-50 py-1 px-3">
                    <CardTitle className="text-sm">OD</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">PIO</Label>
                        <Input
                          value={formData.pio_od}
                          onChange={(e) => handleNumericChange('pio_od', e.target.value)}
                          className={`h-7 text-sm ${isPIOAnormal(formData.pio_od) ? "border-red-500" : ""}`}
                          disabled={!canEdit}
                          placeholder="Ex: 15"
                        />
                        {dernierExamenPrecedent?.pio_od && (
                          <p className="text-xs text-gray-400 mt-0.5">Dernier: {dernierExamenPrecedent.pio_od}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Pachy</Label>
                        <Input
                          value={formData.pachymetrie_od}
                          onChange={(e) => handleNumericChange('pachymetrie_od', e.target.value)}
                          className={`h-7 text-sm ${isPachyAnormal(formData.pachymetrie_od) ? "border-red-500" : ""}`}
                          disabled={!canEdit}
                          placeholder="Ex: 550"
                        />
                        {dernierExamenPrecedent?.pachymetrie_od && (
                          <p className="text-xs text-gray-400 mt-0.5">Dernier: {dernierExamenPrecedent.pachymetrie_od}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">PIO corr</Label>
                        <Input
                          value={formData.pio_corrige_od}
                          onChange={(e) => handleNumericChange('pio_corrige_od', e.target.value)}
                          className="h-7 text-sm"
                          disabled={!canEdit}
                          placeholder="Ex: 14"
                        />
                        {dernierExamenPrecedent?.pio_corrige_od && (
                          <p className="text-xs text-gray-400 mt-0.5">Dernier: {dernierExamenPrecedent.pio_corrige_od}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border">
                  <CardHeader className="bg-green-50 py-1 px-3">
                    <CardTitle className="text-sm">OG</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">PIO</Label>
                        <Input
                          value={formData.pio_og}
                          onChange={(e) => handleNumericChange('pio_og', e.target.value)}
                          className={`h-7 text-sm ${isPIOAnormal(formData.pio_og) ? "border-red-500" : ""}`}
                          disabled={!canEdit}
                          placeholder="Ex: 15"
                        />
                        {dernierExamenPrecedent?.pio_og && (
                          <p className="text-xs text-gray-400 mt-0.5">Dernier: {dernierExamenPrecedent.pio_og}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">Pachy</Label>
                        <Input
                          value={formData.pachymetrie_og}
                          onChange={(e) => handleNumericChange('pachymetrie_og', e.target.value)}
                          className={`h-7 text-sm ${isPachyAnormal(formData.pio_og) ? "border-red-500" : ""}`}
                          disabled={!canEdit}
                          placeholder="Ex: 550"
                        />
                        {dernierExamenPrecedent?.pachymetrie_og && (
                          <p className="text-xs text-gray-400 mt-0.5">Dernier: {dernierExamenPrecedent.pachymetrie_og}</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs">PIO corr</Label>
                        <Input
                          value={formData.pio_corrige_og}
                          onChange={(e) => handleNumericChange('pio_corrige_og', e.target.value)}
                          className="h-7 text-sm"
                          disabled={!canEdit}
                          placeholder="Ex: 14"
                        />
                        {dernierExamenPrecedent?.pio_corrige_og && (
                          <p className="text-xs text-gray-400 mt-0.5">Dernier: {dernierExamenPrecedent.pio_corrige_og}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Card className="border border-teal-200">
                  <CardHeader className="bg-teal-50 py-1 px-2">
                    <CardTitle className="text-xs">Kératométrie</CardTitle>
                  </CardHeader>
                  <CardContent className="py-1 px-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">OD</p>
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="K1" value={formData.keratometrie_od_k1} onChange={(e) => handleNumericChange('keratometrie_od_k1', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Axe" value={formData.keratometrie_od_k1_axe} onChange={(e) => handleNumericChange('keratometrie_od_k1_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="K2" value={formData.keratometrie_od_k2} onChange={(e) => handleNumericChange('keratometrie_od_k2', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Axe" value={formData.keratometrie_od_k2_axe} onChange={(e) => handleNumericChange('keratometrie_od_k2_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="KM" value={formData.keratometrie_od_km} onChange={(e) => handleNumericChange('keratometrie_od_km', e.target.value)} className="h-6 text-xs bg-teal-50" disabled={!canEdit} />
                        <Input placeholder="Cyl" value={calculerCylindreCorneenFinal(formData.keratometrie_od_k2, formData.keratometrie_od_k1)} className="h-6 text-xs bg-orange-50" disabled />
                      </div>
                      <p className="text-xs font-semibold mt-2">OG</p>
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="K1" value={formData.keratometrie_og_k1} onChange={(e) => handleNumericChange('keratometrie_og_k1', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Axe" value={formData.keratometrie_og_k1_axe} onChange={(e) => handleNumericChange('keratometrie_og_k1_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="K2" value={formData.keratometrie_og_k2} onChange={(e) => handleNumericChange('keratometrie_og_k2', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Axe" value={formData.keratometrie_og_k2_axe} onChange={(e) => handleNumericChange('keratometrie_og_k2_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <Input placeholder="KM" value={formData.keratometrie_og_km} onChange={(e) => handleNumericChange('keratometrie_og_km', e.target.value)} className="h-6 text-xs bg-teal-50" disabled={!canEdit} />
                        <Input placeholder="Cyl" value={calculerCylindreCorneenFinal(formData.keratometrie_og_k2, formData.keratometrie_og_k1)} className="h-6 text-xs bg-orange-50" disabled />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-purple-200">
                  <CardHeader className="bg-purple-50 py-1 px-2">
                    <CardTitle className="text-xs">Lunettes portées</CardTitle>
                  </CardHeader>
                  <CardContent className="py-1 px-2">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">OD</p>
                      <div className="grid grid-cols-4 gap-1">
                        <Input placeholder="Sph" value={formData.lunettes_portees_od_sphere} onChange={(e) => handleNumericChange('lunettes_portees_od_sphere', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Cyl" value={formData.lunettes_portees_od_cylindre} onChange={(e) => handleNumericChange('lunettes_portees_od_cylindre', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Axe" value={formData.lunettes_portees_od_axe} onChange={(e) => handleNumericChange('lunettes_portees_od_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Select
                          value={formData.lunettes_portees_od_av}
                          onValueChange={(value) => handleChange('lunettes_portees_od_av', value)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className={`h-6 text-xs ${isAVAnormal(formData.lunettes_portees_od_av) ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="AV" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>--</SelectItem>
                            {echelleAcuiteVisuelle.map((av) => (
                              <SelectItem key={av} value={av}>{av}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs font-semibold">OG</p>
                      <div className="grid grid-cols-4 gap-1">
                        <Input placeholder="Sph" value={formData.lunettes_portees_og_sphere} onChange={(e) => handleNumericChange('lunettes_portees_og_sphere', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Cyl" value={formData.lunettes_portees_og_cylindre} onChange={(e) => handleNumericChange('lunettes_portees_og_cylindre', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Input placeholder="Axe" value={formData.lunettes_portees_og_axe} onChange={(e) => handleNumericChange('lunettes_portees_og_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                        <Select
                          value={formData.lunettes_portees_og_av}
                          onValueChange={(value) => handleChange('lunettes_portees_og_av', value)}
                          disabled={!canEdit}
                        >
                          <SelectTrigger className={`h-6 text-xs ${isAVAnormal(formData.lunettes_portees_og_av) ? "border-red-500" : ""}`}>
                            <SelectValue placeholder="AV" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>--</SelectItem>
                            {echelleAcuiteVisuelle.map((av) => (
                              <SelectItem key={av} value={av}>{av}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Card className="border border-orange-200">
              <CardHeader className="bg-orange-50 py-1 px-2">
                <CardTitle className="text-xs">Autoréfractométrie</CardTitle>
              </CardHeader>
              <CardContent className="py-1 px-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold">OD</p>
                  <div className="grid grid-cols-3 gap-1">
                    <Input placeholder="Sph" value={formData.autoref_od_sphere} onChange={(e) => handleNumericChange('autoref_od_sphere', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Cyl" value={formData.autoref_od_cylindre} onChange={(e) => handleNumericChange('autoref_od_cylindre', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Axe" value={formData.autoref_od_axe} onChange={(e) => handleNumericChange('autoref_od_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                  </div>
                  <p className="text-xs font-semibold">OG</p>
                  <div className="grid grid-cols-3 gap-1">
                    <Input placeholder="Sph" value={formData.autoref_og_sphere} onChange={(e) => handleNumericChange('autoref_og_sphere', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Cyl" value={formData.autoref_og_cylindre} onChange={(e) => handleNumericChange('autoref_og_cylindre', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Axe" value={formData.autoref_og_axe} onChange={(e) => handleNumericChange('autoref_og_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                  </div>
                  <div className="grid grid-cols-3 gap-1 mt-2 pt-2 border-t border-orange-200">
                    <Input placeholder="PD (mm)" value={formData.pd} onChange={(e) => handleNumericChange('pd', e.target.value)} className="h-6 text-xs bg-orange-50" disabled={!canEdit} title="Distance interpupillaire" />
                    <Input placeholder="PS OD" value={formData.ps_od} onChange={(e) => handleNumericChange('ps_od', e.target.value)} className="h-6 text-xs bg-orange-50" disabled={!canEdit} title="Pupil Size OD" />
                    <Input placeholder="PS OG" value={formData.ps_og} onChange={(e) => handleNumericChange('ps_og', e.target.value)} className="h-6 text-xs bg-orange-50" disabled={!canEdit} title="Pupil Size OG" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-cyan-200">
              <CardHeader className="bg-cyan-50 py-1 px-2 flex-row items-center justify-between">
                <CardTitle className="text-xs">Réfraction subjective</CardTitle>
                <div className="flex items-center gap-1">
                  <Label className="text-xs">Cycloplégie</Label>
                  <Switch
                    checked={formData.ref_subjective_sous_skiacol}
                    onCheckedChange={(checked) => handleChange('ref_subjective_sous_skiacol', checked)}
                    className="scale-75"
                    disabled={!canEdit}
                  />
                </div>
              </CardHeader>
              <CardContent className="py-1 px-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold">OD</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Input placeholder="Sph" value={formData.ref_subjective_od_sphere} onChange={(e) => handleNumericChange('ref_subjective_od_sphere', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Cyl" value={formData.ref_subjective_od_cylindre} onChange={(e) => handleNumericChange('ref_subjective_od_cylindre', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Axe" value={formData.ref_subjective_od_axe} onChange={(e) => handleNumericChange('ref_subjective_od_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Select
                      value={formData.ref_subjective_od_avl}
                      onValueChange={(value) => handleChange('ref_subjective_od_avl', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className={`h-6 text-xs ${isAVAnormal(formData.ref_subjective_od_avl) ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="AVL" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>--</SelectItem>
                        {echelleAcuiteVisuelle.map((av) => (
                          <SelectItem key={av} value={av}>{av}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <Input placeholder="Add" value={formData.ref_subjective_od_add} onChange={(e) => handleNumericChange('ref_subjective_od_add', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Select
                      value={formData.ref_subjective_od_avp}
                      onValueChange={(value) => handleChange('ref_subjective_od_avp', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="AVP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>--</SelectItem>
                        {echelleParinaud.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs font-semibold mt-1">OG</p>
                  <div className="grid grid-cols-4 gap-1">
                    <Input placeholder="Sph" value={formData.ref_subjective_og_sphere} onChange={(e) => handleNumericChange('ref_subjective_og_sphere', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Cyl" value={formData.ref_subjective_og_cylindre} onChange={(e) => handleNumericChange('ref_subjective_og_cylindre', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Input placeholder="Axe" value={formData.ref_subjective_og_axe} onChange={(e) => handleNumericChange('ref_subjective_og_axe', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Select
                      value={formData.ref_subjective_og_avl}
                      onValueChange={(value) => handleChange('ref_subjective_og_avl', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className={`h-6 text-xs ${isAVAnormal(formData.ref_subjective_og_avl) ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="AVL" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>--</SelectItem>
                        {echelleAcuiteVisuelle.map((av) => (
                          <SelectItem key={av} value={av}>{av}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <Input placeholder="Add" value={formData.ref_subjective_og_add} onChange={(e) => handleNumericChange('ref_subjective_og_add', e.target.value)} className="h-6 text-xs" disabled={!canEdit} />
                    <Select
                      value={formData.ref_subjective_og_avp}
                      onValueChange={(value) => handleChange('ref_subjective_og_avp', value)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue placeholder="AVP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>--</SelectItem>
                        {echelleParinaud.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {currentExamenIndex === 0 && (
            <Card className="border border-green-200">
              <CardHeader className="bg-green-50 py-1 px-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">Examen de la motilité</CardTitle>
                  {raccourcisMotilite.length > 0 && canEdit && (
                    <div className="flex gap-1 flex-wrap">
                      {raccourcisMotilite.map((raccourci) => (
                        <Button
                          key={raccourci.id}
                          size="sm"
                          variant="outline"
                          onClick={() => appliquerRaccourci('examen_motilite', raccourci.texte)}
                          className="h-6 text-xs px-2"
                          disabled={!canEdit}
                        >
                          {raccourci.nom}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="py-2 px-3">
                <Textarea
                  value={formData.examen_motilite}
                  onChange={(e) => handleChange('examen_motilite', e.target.value)}
                  placeholder="Motilité, convergence, phories, tropies..."
                  rows={3}
                  className="text-sm"
                  disabled={!canEdit}
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-indigo-200">
        <CardHeader className="bg-indigo-50 py-2 px-3 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Glasses className="w-4 h-4" />
            Prescription de verres {!canEditPrescription && <Badge className="bg-gray-100 text-gray-600 text-xs">Lecture seule</Badge>}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={convertirCylindre}
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              disabled={!canEditPrescription || ((!prescriptionVerres.od_cylindre || parseFloat(prescriptionVerres.od_cylindre) === 0) && (!prescriptionVerres.og_cylindre || parseFloat(prescriptionVerres.og_cylindre) === 0))}
              title={cylindrePositif ? "Convertir en cylindre négatif" : "Convertir en cylindre positif"}
            >
              <RefreshCw className="w-3 h-3" />
              {cylindrePositif ? "Cyl -" : "Cyl +"}
            </Button>
            <Button
              onClick={copierRefractionSubjective}
              variant="outline"
              size="sm"
              className="gap-1 h-7 text-xs"
              disabled={!canEditPrescription || (!formData.ref_subjective_od_sphere && !formData.ref_subjective_og_sphere)}
            >
              <Copy className="w-3 h-3" />
              Copier réf. subjective
            </Button>
            <Button
              onClick={handleImprimerOrdonnanceLunettes}
              variant="outline"
              size="sm"
              className="gap-1 bg-purple-50 hover:bg-purple-100 border-purple-200 h-7 text-xs"
              disabled={!canEditPrescription || (!formData.ref_subjective_od_sphere && !formData.ref_subjective_og_sphere && !prescriptionVerres.od_sphere && !prescriptionVerres.og_sphere)}
            >
              <Printer className="w-3 h-3" />
              Nouvelle ordonnance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold text-xs mb-2">OD</p>
              <div className="grid grid-cols-4 gap-1">
                <div>
                  <Label className="text-xs">Sph</Label>
                  <Input
                    placeholder="Sph"
                    value={prescriptionVerres.od_sphere}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, od_sphere: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cyl</Label>
                  <Input
                    placeholder="Cyl"
                    value={prescriptionVerres.od_cylindre}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, od_cylindre: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
                <div>
                  <Label className="text-xs">Axe</Label>
                  <Input
                    placeholder="Axe"
                    value={prescriptionVerres.od_axe}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, od_axe: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
                <div>
                  <Label className="text-xs">Add</Label>
                  <Input
                    placeholder="Add"
                    value={prescriptionVerres.od_addition}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, od_addition: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold text-xs mb-2">OG</p>
              <div className="grid grid-cols-4 gap-1">
                <div>
                  <Label className="text-xs">Sph</Label>
                  <Input
                    placeholder="Sph"
                    value={prescriptionVerres.og_sphere}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, og_sphere: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cyl</Label>
                  <Input
                    placeholder="Cyl"
                    value={prescriptionVerres.og_cylindre}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, og_cylindre: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
                <div>
                  <Label className="text-xs">Axe</Label>
                  <Input
                    placeholder="Axe"
                    value={prescriptionVerres.og_axe}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, og_axe: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
                <div>
                  <Label className="text-xs">Add</Label>
                  <Input
                    placeholder="Add"
                    value={prescriptionVerres.og_addition}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^[0-9+\-.]*$/.test(value) || value === '') {
                        setPrescriptionVerres({...prescriptionVerres, og_addition: value});
                      }
                    }}
                    className="h-7 text-xs"
                    disabled={!canEditPrescription}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {verresPrescrit.length > 0 && (
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-purple-50 py-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Glasses className="w-5 h-5" />
              Historique des verres prescrits
            </CardTitle>
          </CardHeader>
          <CardContent className="py-3">
            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {verresPrescrit.map((verre) => {
                const datePrescription = new Date(verre.date_prescription);
                const maintenant = new Date();
                const differenceHeures = (maintenant - datePrescription) / (1000 * 60 * 60);
                const peutSupprimer = canEditPrescription && differenceHeures <= 24;

                return (
                  <Card key={verre.id} className="border">
                    <CardContent className="py-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2">
                          <Badge className="bg-purple-100 text-purple-800">{verre.type_vision}</Badge>
                          {verre.type_verres && <Badge variant="outline">{verre.type_verres}</Badge>}
                          {verre.type_teinte && <Badge variant="outline" className="bg-gray-100">{verre.type_teinte}</Badge>}
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-gray-500">
                            {format(new Date(verre.date_prescription), 'dd/MM/yyyy')}
                          </span>
                          {canPrintOrEmail && (
                            <>
                              <Button
                                onClick={() => imprimerOrdonnance(verre)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                title="Imprimer"
                              >
                                <Printer className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleEnvoyerEmail(verre)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2"
                                title="Envoyer par email"
                                disabled={!patient.email}
                              >
                                <Mail className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                          {canEditPrescription && (
                            <>
                              <Button
                                onClick={() => handleRenouveler(verre)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="Renouveler"
                              >
                                <RefreshCw className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleModifierEtImprimer(verre)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Modifier et imprimer"
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                onClick={() => handleDeleteVerres(verre)}
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title={peutSupprimer ? "Supprimer" : "Suppression impossible après 24h"}
                                disabled={!peutSupprimer}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-xs mb-1">OD</p>
                          <p className="text-xs">
                            {verre.od_sphere && `Sphère: ${verre.od_sphere}`}
                            {verre.od_cylindre && ` | Cylindre: ${verre.od_cylindre}`}
                            {verre.od_axe && ` | Axe: ${verre.od_axe}°`}
                            {verre.od_addition && verre.type_vision !== "Vision de près" && ` | Add: ${verre.od_addition}`}
                          </p>
                        </div>
                        <div>
                          <p className="font-semibold text-xs mb-1">OG</p>
                          <p className="text-xs">
                            {verre.og_sphere && `Sphère: ${verre.og_sphere}`}
                            {verre.og_cylindre && ` | Cylindre: ${verre.og_cylindre}`}
                            {verre.og_axe && ` | Axe: ${verre.og_axe}°`}
                            {verre.og_addition && verre.type_vision !== "Vision de près" && ` | Add: ${verre.og_addition}`}
                          </p>
                        </div>
                      </div>
                      {verre.notes && <p className="text-xs text-gray-600 mt-2"><strong>Notes:</strong> {verre.notes}</p>}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showOrdonnanceLunetteDialog} onOpenChange={(open) => {
        setShowOrdonnanceLunetteDialog(open);
        if (!open) {
          setEditingVerre(null);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-5 h-5" />
              {editingVerre ? "Modifier et imprimer l'ordonnance" : "Nouvelle ordonnance de lunettes"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de vision *</Label>
              <Select
                value={ordonnanceLunetteData.type_vision}
                onValueChange={(value) => setOrdonnanceLunetteData({ ...ordonnanceLunetteData, type_vision: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vision de loin">Vision de loin</SelectItem>
                  <SelectItem value="Vision de près">Vision de près</SelectItem>
                  <SelectItem value="Mi-distance">Mi-distance</SelectItem>
                  <SelectItem value="Progressifs">Progressifs</SelectItem>
                </SelectContent>
              </Select>
              {ordonnanceLunetteData.type_vision === "Vision de près" && (
                <p className="text-xs text-orange-600 mt-1">
                  ℹ️ La sphère sera automatiquement calculée (sphère + addition). L'addition ne sera pas affichée.
                </p>
              )}
            </div>

            <div>
              <Label>Type de verres</Label>
              <Input
                value={ordonnanceLunetteData.type_verres}
                onChange={(e) => setOrdonnanceLunetteData({ ...ordonnanceLunetteData, type_verres: e.target.value })}
                placeholder="Ex: Unifocaux, Bifocaux, Progressifs..."
              />
            </div>

            <div>
              <Label>Type de teinte (optionnel)</Label>
              <Input
                value={ordonnanceLunetteData.type_teinte}
                onChange={(e) => setOrdonnanceLunetteData({ ...ordonnanceLunetteData, type_teinte: e.target.value })}
                placeholder="Ex: Photochromique, Teinte brune..."
              />
            </div>

            <div>
              <Label>Notes additionnelles (optionnel)</Label>
              <Textarea
                value={ordonnanceLunetteData.notes || ""}
                onChange={(e) => setOrdonnanceLunetteData({ ...ordonnanceLunetteData, notes: e.target.value })}
                placeholder="Ex: Port permanent, uniquement pour la conduite..."
                rows={2}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-gray-700">
                Les données de prescription de verres seront utilisées pour l'ordonnance.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setShowOrdonnanceLunetteDialog(false);
                setEditingVerre(null);
              }}>
                Annuler
              </Button>
              <Button onClick={() => handleCreerOrdonnanceLunette(false)} className="bg-green-600 hover:bg-green-700">
                Enregistrer
              </Button>
              <Button
                onClick={() => handleCreerOrdonnanceLunette(true)}
                className="bg-purple-600 hover:bg-purple-700"
                title="Enregistrer et imprimer (F5)"
              >
                <Printer className="w-4 h-4 mr-2" />
                Enregistrer et imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
