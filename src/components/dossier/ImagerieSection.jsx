
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Save, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
import { format, isSameDay } from "date-fns";

const TYPES_IMAGERIE = [
  { value: "OCT", label: "OCT (Tomographie en cohérence optique)" },
  { value: "Champ_visuel", label: "Champ visuel" },
  { value: "Angiographie", label: "Angiographie" },
  { value: "Topographie_corneenne", label: "Topographie cornéenne" },
  { value: "Biometrie", label: "Biométrie" },
  { value: "Pachymetrie", label: "Pachymétrie" },
  { value: "Retinographie", label: "Rétinographie" }
];

export default function ImagerieSection({ patientId, patient }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedType, setSelectedType] = useState("OCT");
  const [interpretation, setInterpretation] = useState("");
  const [currentId, setCurrentId] = useState(null);
  
  const [formData, setFormData] = useState({
    patient_id: patientId,
    date_imagerie: new Date().toISOString(),
    type_examen: "OCT",
    oeil: "Les_deux",
    image_url: "",
    interpretation: "",
    notes: ""
  });

  const { data: imageries, isLoading } = useQuery({
    queryKey: ['imageries', patientId],
    queryFn: async () => {
      const allImageries = await base44.entities.Imagerie.list('-date_imagerie');
      return allImageries.filter(i => i.patient_id === patientId);
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
    const aujourdhui = new Date();
    const imageriesDuType = imageries.filter(img => 
      img.type_examen === selectedType && 
      isSameDay(new Date(img.date_imagerie), aujourdhui)
    );
    
    if (imageriesDuType.length > 0) {
      const derniere = imageriesDuType[0];
      setInterpretation(derniere.interpretation || "");
      setCurrentId(derniere.id);
    } else {
      setInterpretation("");
      setCurrentId(null);
    }
  }, [selectedType, imageries]);

  const createImagerieMutation = useMutation({
    mutationFn: (data) => base44.entities.Imagerie.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imageries', patientId] });
    },
  });

  const updateImagerieMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Imagerie.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imageries', patientId] });
    },
  });

  const createImageriePleineMutation = useMutation({
    mutationFn: (data) => base44.entities.Imagerie.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imageries', patientId] });
      setShowDialog(false);
      setFormData({
        patient_id: patientId,
        date_imagerie: new Date().toISOString(),
        type_examen: "OCT",
        oeil: "Les_deux",
        image_url: "",
        interpretation: "",
        notes: ""
      });
    },
  });

  // Écouter l'événement de sauvegarde depuis le parent
  useEffect(() => {
    const handleSave = async () => {
      if (!interpretation) return;
      
      if (currentId) {
        await updateImagerieMutation.mutateAsync({
          id: currentId,
          data: { interpretation }
        });
      } else {
        await createImagerieMutation.mutateAsync({
          patient_id: patientId,
          date_imagerie: new Date().toISOString(),
          type_examen: selectedType,
          oeil: "Les_deux",
          interpretation
        });
      }
    };

    window.addEventListener('dossier-save', handleSave);
    return () => window.removeEventListener('dossier-save', handleSave);
  }, [interpretation, currentId, selectedType]);

  // Écouter l'événement mega-raccourci
  useEffect(() => {
    const handleMegaRaccourci = (e) => {
      const megaRaccourci = e.detail;
      if (megaRaccourci.interpretation_imagerie) {
        setInterpretation(prev => 
          prev ? prev + " " + megaRaccourci.interpretation_imagerie : megaRaccourci.interpretation_imagerie
        );
      }
    };

    window.addEventListener('mega-raccourci-applied', handleMegaRaccourci);
    return () => window.removeEventListener('mega-raccourci-applied', handleMegaRaccourci);
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, image_url: result.file_url });
    setUploadingImage(false);
  };

  const handleSaveImagerie = () => {
    createImageriePleineMutation.mutate(formData);
  };

  const imageriesHistorique = imageries.filter(img => {
    const aujourdhui = new Date();
    return !isSameDay(new Date(img.date_imagerie), aujourdhui);
  });

  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Imagerie</h2>
        <Button
          onClick={() => setShowDialog(true)}
          className="bg-blue-600 hover:bg-blue-700 gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter avec image
        </Button>
      </div>

      <Card>
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
          <CardTitle>Interprétation d'imagerie</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="w-1/3">
              <Label className="mb-2 block">Type d'imagerie</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_IMAGERIE.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Label className="mb-2 block">Interprétation</Label>
              <Textarea
                value={interpretation}
                onChange={(e) => setInterpretation(e.target.value)}
                rows={8}
                placeholder="Écrire l'interprétation de l'imagerie..."
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {imageriesHistorique.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Historique des imageries</h3>
          {imageriesHistorique.map((imagerie) => (
            <Card key={imagerie.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-lg">
                      {imagerie.type_examen?.replace(/_/g, ' ')} - {imagerie.oeil?.replace(/_/g, ' ')}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {format(new Date(imagerie.date_imagerie), 'dd/MM/yyyy à HH:mm')}
                    </p>
                  </div>
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {imagerie.image_url && (
                  <div className="mb-4">
                    <img
                      src={imagerie.image_url}
                      alt="Imagerie médicale"
                      className="w-full max-h-96 object-contain rounded-lg border"
                    />
                  </div>
                )}
                {imagerie.interpretation && (
                  <div className="mb-3">
                    <p className="text-sm font-semibold text-gray-700">Interprétation</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{imagerie.interpretation}</p>
                  </div>
                )}
                {imagerie.notes && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Notes</p>
                    <p className="text-gray-600 whitespace-pre-wrap">{imagerie.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ajouter une imagerie avec image</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type d'examen</Label>
                <Select
                  value={formData.type_examen}
                  onValueChange={(value) => setFormData({ ...formData, type_examen: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_IMAGERIE.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Œil</Label>
                <Select
                  value={formData.oeil}
                  onValueChange={(value) => setFormData({ ...formData, oeil: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OD">OD (Œil Droit)</SelectItem>
                    <SelectItem value="OG">OG (Œil Gauche)</SelectItem>
                    <SelectItem value="Les_deux">Les deux</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Interprétation</Label>
              <Textarea
                value={formData.interpretation}
                onChange={(e) => setFormData({ ...formData, interpretation: e.target.value })}
                rows={6}
                placeholder="Interprétation de l'imagerie..."
              />
            </div>

            <div>
              <Label>Image (optionnel)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload">
                  <Button
                    variant="outline"
                    className="gap-2 w-full"
                    disabled={uploadingImage}
                    asChild
                  >
                    <span>
                      {uploadingImage ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Téléchargement...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Télécharger une image
                        </>
                      )}
                    </span>
                  </Button>
                </label>
                {formData.image_url && (
                  <div className="mt-3">
                    <img
                      src={formData.image_url}
                      alt="Aperçu"
                      className="w-full max-h-64 object-contain rounded-lg border"
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label>Notes additionnelles</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleSaveImagerie}
                disabled={!formData.type_examen || !formData.interpretation}
                className="bg-green-600 hover:bg-green-700 gap-2"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
