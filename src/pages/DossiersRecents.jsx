import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Clock, User, Calendar, Phone, MapPin, Cake } from "lucide-react";
import { format, differenceInYears, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DossiersRecents() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    loadUser();
  }, []);

  const { data: dossiersRecents, isLoading } = useQuery({
    queryKey: ['dossiers-recents'],
    queryFn: async () => {
      const allPatients = await base44.entities.Patient.list('-dossier_ouvert_date');
      // Filtrer uniquement les patients qui ont déjà eu leur dossier ouvert
      return allPatients.filter(p => p.dossier_ouvert_date).slice(0, 50); // Les 50 derniers
    },
    refetchInterval: 30000,
    initialData: [],
  });

  const getAge = (dateNaissance) => {
    if (!dateNaissance) return "N/A";
    return differenceInYears(new Date(), new Date(dateNaissance));
  };

  const isBirthday = (dateNaissance) => {
    if (!dateNaissance) return false;
    const today = new Date();
    const birthDate = new Date(dateNaissance);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
  };

  const statutConfig = {
    en_attente: { 
      label: "En attente", 
      color: "bg-yellow-100 text-yellow-800 border-yellow-300"
    },
    vu_orthoptiste: { 
      label: "Vu orthoptiste", 
      color: "bg-green-100 text-green-800 border-green-300"
    },
    vu_ophtalmologue: { 
      label: "Vu ophtalmologue", 
      color: "bg-red-100 text-red-800 border-red-300"
    },
    termine: { 
      label: "Terminé", 
      color: "bg-gray-100 text-gray-800 border-gray-300"
    }
  };

  const handleOpenDossier = (patientId) => {
    navigate(createPageUrl(`DossierPatient?id=${patientId}`));
  };

  return (
    <div className="p-4 md:p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dossiers récents</h1>
              <p className="text-gray-500 mt-1">Derniers dossiers patients consultés</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Historique des consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement...</div>
            ) : dossiersRecents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Aucun dossier récent
              </div>
            ) : (
              <div className="space-y-3">
                {dossiersRecents.map((patient) => {
                  const config = statutConfig[patient.statut_salle_attente] || statutConfig.termine;
                  
                  return (
                    <div
                      key={patient.id}
                      onClick={() => handleOpenDossier(patient.id)}
                      className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all cursor-pointer bg-white group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center gap-1">
                          {isBirthday(patient.date_naissance) && (
                            <Cake className="w-5 h-5 text-pink-500" title="Anniversaire aujourd'hui !" />
                          )}
                          <div className={`w-12 h-12 bg-gradient-to-br ${
                            patient.genre === "Femme" ? "from-pink-500 to-rose-500" : 
                            patient.genre === "Homme" ? "from-blue-500 to-cyan-500" : 
                            "from-gray-500 to-gray-600"
                          } rounded-full flex items-center justify-center group-hover:scale-110 transition-transform`}>
                            <span className="text-white font-bold text-lg">
                              {patient.prenom?.charAt(0)}{patient.nom?.charAt(0)}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {patient.prenom} {patient.nom}
                            </h3>
                            <Badge 
                              variant="outline" 
                              className={
                                patient.genre === "Femme" ? "bg-pink-50 text-pink-700 border-pink-200 text-xs" : 
                                patient.genre === "Homme" ? "bg-blue-50 text-blue-700 border-blue-200 text-xs" : 
                                "bg-gray-50 text-gray-700 text-xs"
                              }
                            >
                              {patient.genre}
                            </Badge>
                            <Badge className={`${config.color} border px-2 py-0.5 text-xs`}>
                              {config.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm text-gray-600">
                            {patient.dossier_ouvert_date && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-purple-500" />
                                <span className="text-xs">
                                  {formatDistanceToNow(new Date(patient.dossier_ouvert_date), { 
                                    addSuffix: true,
                                    locale: fr 
                                  })}
                                </span>
                              </div>
                            )}
                            
                            {patient.dossier_ouvert_par && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-blue-500" />
                                <span className="text-xs truncate">{patient.dossier_ouvert_par}</span>
                              </div>
                            )}
                            
                            {patient.date_naissance && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-green-500" />
                                <span className="text-xs">{getAge(patient.date_naissance)} ans</span>
                              </div>
                            )}
                            
                            {patient.telephone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-orange-500" />
                                <span className="text-xs">{patient.telephone}</span>
                              </div>
                            )}
                          </div>
                          
                          {patient.adresse && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500 truncate">{patient.adresse}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4">
                        {patient.dossier_ouvert_date && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">
                              {format(new Date(patient.dossier_ouvert_date), 'dd/MM/yyyy')}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(patient.dossier_ouvert_date), 'HH:mm')}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}