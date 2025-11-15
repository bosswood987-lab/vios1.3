
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
import { Plus, Trash2, TrendingUp, Eye, Activity } from "lucide-react";
import { format, parseISO } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function IVTSection({ patientId, patient }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: patientId,
    date_injection: new Date().toISOString().split('T')[0],
    oeil: "OD",
    acuite_visuelle: "",
    epaisseur_maculaire: "",
    produit_injecte: "Eylea",
    notes: ""
  });

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null);
      setCurrentUser(user || { email: 'default@user.com' });
    };
    loadUser();
  }, []);

  const canEdit = true; // Always true

  const { data: ivts, isLoading } = useQuery({
    queryKey: ['ivts', patientId],
    queryFn: async () => {
      const allIVTs = await base44.entities.IVT.list('-date_injection');
      return allIVTs.filter(ivt => ivt.patient_id === patientId);
    },
    initialData: [],
  });

  const createIVTMutation = useMutation({
    mutationFn: (data) => base44.entities.IVT.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ivts', patientId] });
      setShowDialog(false);
      setFormData({
        patient_id: patientId,
        date_injection: new Date().toISOString().split('T')[0],
        oeil: "OD",
        acuite_visuelle: "",
        epaisseur_maculaire: "",
        produit_injecte: "Eylea",
        notes: ""
      });
    },
  });

  const deleteIVTMutation = useMutation({
    mutationFn: (id) => base44.entities.IVT.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ivts', patientId] });
    },
  });

  const handleSave = () => {
    createIVTMutation.mutate({
      ...formData,
      epaisseur_maculaire: formData.epaisseur_maculaire ? parseFloat(formData.epaisseur_maculaire) : null
    });
  };

  const handleDelete = (id) => {
    if (!canEdit) return;
    if (confirm('Voulez-vous vraiment supprimer cette injection ?')) {
      deleteIVTMutation.mutate(id);
    }
  };

  // Préparer les données pour les graphiques
  const prepareChartData = (oeil) => {
    const ivtsOeil = ivts
      .filter(ivt => ivt.oeil === oeil)
      .sort((a, b) => new Date(a.date_injection) - new Date(b.date_injection));

    return ivtsOeil.map(ivt => ({
      date: format(parseISO(ivt.date_injection), 'dd/MM/yyyy'),
      acuite: ivt.acuite_visuelle,
      epaisseur: ivt.epaisseur_maculaire || null,
      produit: ivt.produit_injecte
    }));
  };

  const chartDataOD = prepareChartData('OD');
  const chartDataOG = prepareChartData('OG');

  // Convertir l'acuité visuelle en nombre pour le graphique
  const convertAcuiteToNumber = (acuite) => {
    if (!acuite) return null;
    const match = acuite.match(/(\d+)\/(\d+)/);
    if (match) {
      return (parseFloat(match[1]) / parseFloat(match[2]) * 10).toFixed(1);
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Suivi IVT (Injections IntraViTRéennes)
          </h2>
          <p className="text-sm text-gray-600 mt-1">Suivi de l'acuité visuelle et de l'épaisseur maculaire</p>
        </div>
        {canEdit && (
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle injection
          </Button>
        )}
      </div>

      {/* Graphiques */}
      {ivts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Graphique OD */}
          {chartDataOD.length > 0 && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Évolution OD (Œil Droit)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">Acuité Visuelle</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartDataOD}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={(data) => convertAcuiteToNumber(data.acuite)}
                        stroke="#f97316" 
                        strokeWidth={2}
                        name="Acuité (/10)"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {chartDataOD.some(d => d.epaisseur) && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Épaisseur Maculaire (µm)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartDataOD}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="epaisseur" 
                          stroke="#dc2626" 
                          strokeWidth={2}
                          name="Épaisseur (µm)"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Graphique OG */}
          {chartDataOG.length > 0 && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Évolution OG (Œil Gauche)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <h4 className="font-semibold text-sm mb-2">Acuité Visuelle</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartDataOG}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey={(data) => convertAcuiteToNumber(data.acuite)}
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Acuité (/10)"
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {chartDataOG.some(d => d.epaisseur) && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">Épaisseur Maculaire (µm)</h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={chartDataOG}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="epaisseur" 
                          stroke="#059669" 
                          strokeWidth={2}
                          name="Épaisseur (µm)"
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Liste des injections */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des injections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : ivts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucune injection enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ivts.map((ivt) => (
                <Card key={ivt.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            ivt.oeil === 'OD' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {ivt.oeil}
                          </div>
                          <span className="text-sm text-gray-500">
                            {format(parseISO(ivt.date_injection), 'dd/MM/yyyy')}
                          </span>
                          {ivt.produit_injecte && (
                            <span className="text-sm font-medium text-blue-600">
                              {ivt.produit_injecte}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {ivt.acuite_visuelle && (
                            <div>
                              <span className="text-gray-600">Acuité visuelle:</span>
                              <span className="ml-2 font-semibold">{ivt.acuite_visuelle}</span>
                            </div>
                          )}
                          {ivt.epaisseur_maculaire && (
                            <div>
                              <span className="text-gray-600">Épaisseur maculaire:</span>
                              <span className="ml-2 font-semibold">{ivt.epaisseur_maculaire} µm</span>
                            </div>
                          )}
                        </div>

                        {ivt.notes && (
                          <p className="text-sm text-gray-600 mt-2 italic">{ivt.notes}</p>
                        )}
                      </div>

                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ivt.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour nouvelle injection */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle injection IVT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date d'injection *</Label>
                <Input
                  type="date"
                  value={formData.date_injection}
                  onChange={(e) => setFormData({ ...formData, date_injection: e.target.value })}
                />
              </div>
              <div>
                <Label>Œil *</Label>
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Produit injecté</Label>
              <Select
                value={formData.produit_injecte}
                onValueChange={(value) => setFormData({ ...formData, produit_injecte: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Eylea">Eylea (Aflibercept)</SelectItem>
                  <SelectItem value="Lucentis">Lucentis (Ranibizumab)</SelectItem>
                  <SelectItem value="Avastin">Avastin (Bevacizumab)</SelectItem>
                  <SelectItem value="Beovu">Beovu (Brolucizumab)</SelectItem>
                  <SelectItem value="Vabysmo">Vabysmo (Faricimab)</SelectItem>
                  <SelectItem value="Ozurdex">Ozurdex (Dexaméthasone)</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Acuité visuelle</Label>
                <Input
                  value={formData.acuite_visuelle}
                  onChange={(e) => setFormData({ ...formData, acuite_visuelle: e.target.value })}
                  placeholder="Ex: 5/10, 8/10"
                />
              </div>
              <div>
                <Label>Épaisseur maculaire (µm)</Label>
                <Input
                  type="number"
                  value={formData.epaisseur_maculaire}
                  onChange={(e) => setFormData({ ...formData, epaisseur_maculaire: e.target.value })}
                  placeholder="Ex: 350"
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Observations additionnelles..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.date_injection || !formData.oeil}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
