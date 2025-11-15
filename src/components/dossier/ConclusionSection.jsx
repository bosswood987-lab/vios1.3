
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Save, CheckCircle, FileText, AlertTriangle, X, Eye } from "lucide-react";
import { format, differenceInHours, isSameDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ConclusionSection({ patientId, patient }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [conclusionDuJour, setConclusionDuJour] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { email: 'default@user.com' });
    };
    loadUser();
  }, []);

  const canEdit = true; // Always true

  const initialFormData = {
    patient_id: patientId,
    date_conclusion: new Date().toISOString(),
    diagnostic: "",
    conduite_tenir: "",
    notes: ""
  };

  const [formData, setFormData] = useState(initialFormData);

  const { data: conclusions, isLoading } = useQuery({
    queryKey: ['conclusions', patientId],
    queryFn: async () => {
      const allConclusions = await base44.entities.Conclusion.list('-date_conclusion');
      return allConclusions.filter(c => c.patient_id === patientId);
    },
    initialData: [],
  });

  const { data: megaRaccourcis } = useQuery({
    queryKey: ['mega-raccourcis'],
    queryFn: async () => {
      const all = await base44.entities.MegaRaccourci.list();
      return all;
    },
    initialData: [],
  });

  useEffect(() => {
    if (isInitialized) return;
    
    if (conclusions.length > 0) {
      const derniereConclusion = conclusions[0];
      const dateConclusion = new Date(derniereConclusion.date_conclusion);
      const aujourdhui = new Date();
      
      if (isSameDay(dateConclusion, aujourdhui)) {
        const heuresDiff = differenceInHours(aujourdhui, dateConclusion);
        
        if (heuresDiff < 24) {
          setConclusionDuJour(derniereConclusion);
          const loadedData = {
            patient_id: patientId,
            date_conclusion: derniereConclusion.date_conclusion,
            diagnostic: derniereConclusion.diagnostic || "",
            conduite_tenir: derniereConclusion.conduite_tenir || "",
            notes: derniereConclusion.notes || ""
          };
          setFormData(loadedData);
          setIsReadOnly(false);
        } else {
          setIsReadOnly(true);
        }
      }
    }
    setIsInitialized(true);
  }, [conclusions, patientId, isInitialized]);

  const createConclusionMutation = useMutation({
    mutationFn: (data) => base44.entities.Conclusion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conclusions', patientId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const updateConclusionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Conclusion.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conclusions', patientId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
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

  // Écouter l'événement mega-raccourci
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

  useEffect(() => {
    const handleSave = async () => {
      if (!canEdit) return;
      
      if (conclusionDuJour) {
        await updateConclusionMutation.mutateAsync({ id: conclusionDuJour.id, data: formData });
      } else {
        await createConclusionMutation.mutateAsync(formData);
      }
    };

    window.addEventListener('dossier-save', handleSave);
    return () => window.removeEventListener('dossier-save', handleSave);
  }, [formData, conclusionDuJour, canEdit, createConclusionMutation, updateConclusionMutation]);

  const handleChange = (field, value) => {
    if (!canEdit) return;
    
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
  };

  if (isReadOnly) {
    return (
      <div className="space-y-3">
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="ml-2 text-sm">
            Conclusion de plus de 24 heures - Lecture seule
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {conclusionDuJour && (
        <Alert className="bg-blue-50 border-blue-200 py-2">
          <AlertDescription className="text-xs">
            Modification de la conclusion du {format(new Date(conclusionDuJour.date_conclusion), 'dd/MM/yyyy à HH:mm')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-base">Conclusion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 py-3">
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

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">Historique des conclusions</h3>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Chargement...</div>
        ) : conclusions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Aucune conclusion enregistrée
            </CardContent>
          </Card>
        ) : (
          conclusions.slice(conclusionDuJour ? 1 : 0).map((conclusion) => (
            <Card key={conclusion.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">
                    Conclusion du {format(new Date(conclusion.date_conclusion), 'dd/MM/yyyy')}
                  </CardTitle>
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {conclusion.diagnostic && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Diagnostic</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{conclusion.diagnostic}</p>
                  </div>
                )}
                {conclusion.conduite_tenir && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Conduite à tenir</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{conclusion.conduite_tenir}</p>
                  </div>
                )}
                {conclusion.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Notes</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{conclusion.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
