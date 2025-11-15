
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, Users, Calendar, Printer } from "lucide-react";
import { format, isSameDay, isThisWeek, isThisMonth, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function Recettes() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("jour");

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me().catch(() => null); // Catch error and return null
      // Provide a default user with admin specialite if auth.me() fails or returns null
      setCurrentUser(user || { specialite: 'admin', full_name: 'Utilisateur' });
    };
    loadUser();
  }, []);

  const { data: toutesLesCotations, isLoading } = useQuery({
    queryKey: ['toutes-cotations'],
    queryFn: () => base44.entities.Cotation.list('-date_cotation'),
    initialData: [],
  });

  const { data: patients } = useQuery({
    queryKey: ['patients-for-recettes'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  // Removed the access control check and redirect, as currentUser is now always assumed to have access
  // and the goal is to always show all data.

  const isAdmin = true; // Always show all data, overriding actual user specialite if it were to matter

  // Cotations are no longer filtered by user; all cotations are shown.
  const cotationsFiltrees = toutesLesCotations;

  const cotationsDuJour = cotationsFiltrees.filter(c => 
    isSameDay(new Date(c.date_cotation), new Date())
  );

  const cotationsDeLaSemaine = cotationsFiltrees.filter(c => 
    isThisWeek(new Date(c.date_cotation), { weekStartsOn: 1 })
  );

  const cotationsDuMois = cotationsFiltrees.filter(c => 
    isThisMonth(new Date(c.date_cotation))
  );

  const calculerStatistiques = (cotations) => {
    const recettesTotales = cotations.reduce((sum, c) => sum + (c.total_global || 0), 0);
    const nombreCotations = cotations.length;
    const nombrePatients = new Set(cotations.map(c => c.patient_id)).size;
    const moyenneParCotation = nombreCotations > 0 ? recettesTotales / nombreCotations : 0;

    const statistiquesActes = {};
    cotations.forEach(cotation => {
      cotation.actes?.forEach(acte => {
        if (!statistiquesActes[acte.code]) {
          statistiquesActes[acte.code] = {
            code: acte.code,
            libelle: acte.libelle,
            nombre: 0,
            montantTotal: 0
          };
        }
        statistiquesActes[acte.code].nombre++;
        statistiquesActes[acte.code].montantTotal += (acte.tarif_base * acte.pourcentage_applique / 100) + acte.depassement;
      });
    });

    return {
      recettesTotales,
      nombreCotations,
      nombrePatients,
      moyenneParCotation,
      statistiquesActes: Object.values(statistiquesActes).sort((a, b) => b.nombre - a.nombre)
    };
  };

  const statsJour = calculerStatistiques(cotationsDuJour);
  const statsSemaine = calculerStatistiques(cotationsDeLaSemaine);
  const statsMois = calculerStatistiques(cotationsDuMois);

  const imprimerRecettes = (periode, stats, cotations) => {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Recettes - ${periode}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
          .title { font-size: 20px; font-weight: bold; margin-bottom: 10px; }
          .subtitle { font-size: 14px; color: #666; }
          .stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; margin: 20px 0; }
          .stat-card { padding: 15px; background-color: #f5f5f5; border-radius: 5px; text-align: center; }
          .stat-label { font-size: 11px; color: #666; margin-bottom: 5px; }
          .stat-value { font-size: 24px; font-weight: bold; color: #333; }
          .section-title { font-size: 16px; font-weight: bold; margin: 25px 0 10px 0; }
          .actes-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .actes-table th, .actes-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .actes-table th { background-color: #f0f0f0; font-weight: bold; }
          .cotations-list { margin: 20px 0; }
          .cotation-item { padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px; background-color: #fafafa; }
          .cotation-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .cotation-patient { font-weight: bold; }
          .cotation-montant { font-size: 18px; font-weight: bold; color: #2e7d32; }
          .acte-detail { font-size: 11px; color: #555; margin-left: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="header">
          <div class="title">Recettes ${periode}</div>
          <div class="subtitle">${currentUser?.full_name || 'Utilisateur'} - ${format(new Date(), 'dd/MM/yyyy')}</div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Recettes totales</div>
            <div class="stat-value">${stats.recettesTotales.toFixed(2)}€</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Cotations</div>
            <div class="stat-value">${stats.nombreCotations}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Patients</div>
            <div class="stat-value">${stats.nombrePatients}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Moyenne/cotation</div>
            <div class="stat-value">${stats.moyenneParCotation.toFixed(2)}€</div>
          </div>
        </div>

        <div class="section-title">Statistiques par acte</div>
        <table class="actes-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Libellé</th>
              <th>Nombre</th>
              <th>Montant total</th>
            </tr>
          </thead>
          <tbody>
            ${stats.statistiquesActes.map(acte => `
              <tr>
                <td><strong>${acte.code}</strong></td>
                <td>${acte.libelle}</td>
                <td>${acte.nombre}</td>
                <td><strong>${acte.montantTotal.toFixed(2)}€</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Détail des cotations</div>
        <div class="cotations-list">
          ${cotations.map(cotation => {
            const patient = patients.find(p => p.id === cotation.patient_id);
            return `
              <div class="cotation-item">
                <div class="cotation-header">
                  <div>
                    <div class="cotation-patient">${patient ? `${patient.prenom} ${patient.nom}` : 'Patient inconnu'}</div>
                    <div style="font-size: 11px; color: #666;">${format(new Date(cotation.date_cotation), 'dd/MM/yyyy HH:mm')}</div>
                  </div>
                  <div class="cotation-montant">${cotation.total_global?.toFixed(2)}€</div>
                </div>
                <div>
                  ${cotation.actes?.map(acte => `
                    <div class="acte-detail">
                      • ${acte.code} (${acte.pourcentage_applique}%) - ${acte.libelle}: ${((acte.tarif_base * acte.pourcentage_applique / 100) + acte.depassement).toFixed(2)}€
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const renderStatistiques = (stats) => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2 text-green-800">
            <DollarSign className="w-4 h-4" />
            Recettes totales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-700">{stats.recettesTotales.toFixed(2)}€</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
            <Calendar className="w-4 h-4" />
            Cotations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-700">{stats.nombreCotations}</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2 text-purple-800">
            <Users className="w-4 h-4" />
            Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-purple-700">{stats.nombrePatients}</p>
        </CardContent>
      </Card>

      <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
            <TrendingUp className="w-4 h-4" />
            Moyenne
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-orange-700">{stats.moyenneParCotation.toFixed(2)}€</p>
          <p className="text-xs text-gray-600 mt-1">par cotation</p>
        </CardContent>
      </Card>
    </div>
  );

  const renderStatistiquesActes = (stats) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Statistiques par acte
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stats.statistiquesActes.length === 0 ? (
          <p className="text-center py-4 text-gray-500">Aucun acte</p>
        ) : (
          <div className="space-y-2">
            {stats.statistiquesActes.map((acte, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-semibold text-gray-900">{acte.code}</span>
                  <span className="text-sm text-gray-600 ml-2">{acte.libelle}</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-700">{acte.montantTotal.toFixed(2)}€</p>
                  <p className="text-xs text-gray-500">{acte.nombre} fois</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderListeCotations = (cotations) => (
    <Card>
      <CardHeader>
        <CardTitle>Détail des cotations</CardTitle>
      </CardHeader>
      <CardContent>
        {cotations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Aucune cotation pour cette période
          </div>
        ) : (
          <div className="space-y-3">
            {cotations.map((cotation) => {
              const patient = patients.find(p => p.id === cotation.patient_id);
              
              return (
                <div key={cotation.id} className="border rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {patient ? `${patient.prenom} ${patient.nom}` : 'Patient inconnu'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(cotation.date_cotation), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700">
                        {cotation.total_global?.toFixed(2)}€
                      </p>
                      <p className="text-xs text-gray-500">
                        Base: {cotation.total_base?.toFixed(2)}€
                        {cotation.total_depassement > 0 && ` + ${cotation.total_depassement.toFixed(2)}€`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="border-t pt-2 mt-2">
                    <div className="space-y-1">
                      {cotation.actes?.map((acte, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">{acte.code}</span>
                            <span className="text-xs text-gray-500">
                              ({acte.pourcentage_applique}%)
                            </span>
                            <span className="text-xs text-gray-600">{acte.libelle}</span>
                          </div>
                          <span className="font-semibold text-gray-700">
                            {((acte.tarif_base * acte.pourcentage_applique / 100) + acte.depassement).toFixed(2)}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-green-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recettes</h1>
          <p className="text-gray-500 mt-1">
            {isAdmin ? "Toutes les recettes du cabinet" : "Mes recettes"}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-6">
            <TabsList className="bg-white">
              <TabsTrigger value="jour">Aujourd'hui</TabsTrigger>
              <TabsTrigger value="semaine">Cette semaine</TabsTrigger>
              <TabsTrigger value="mois">Ce mois</TabsTrigger>
            </TabsList>

            <Button
              onClick={() => {
                if (activeTab === "jour") imprimerRecettes("du jour", statsJour, cotationsDuJour);
                if (activeTab === "semaine") imprimerRecettes("de la semaine", statsSemaine, cotationsDeLaSemaine);
                if (activeTab === "mois") imprimerRecettes("du mois", statsMois, cotationsDuMois);
              }}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </Button>
          </div>

          <TabsContent value="jour">
            {renderStatistiques(statsJour)}
            {renderStatistiquesActes(statsJour)}
            {renderListeCotations(cotationsDuJour)}
          </TabsContent>

          <TabsContent value="semaine">
            <div className="mb-4 text-sm text-gray-600">
              Du {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yyyy')} au {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yyyy')}
            </div>
            {renderStatistiques(statsSemaine)}
            {renderStatistiquesActes(statsSemaine)}
            {renderListeCotations(cotationsDeLaSemaine)}
          </TabsContent>

          <TabsContent value="mois">
            <div className="mb-4 text-sm text-gray-600">
              Du {format(startOfMonth(new Date()), 'dd/MM/yyyy')} au {format(endOfMonth(new Date()), 'dd/MM/yyyy')}
            </div>
            {renderStatistiques(statsMois)}
            {renderStatistiquesActes(statsMois)}
            {renderListeCotations(cotationsDuMois)}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
