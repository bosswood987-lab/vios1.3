
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Users, Eye, FileText, Settings, ClipboardList, DollarSign, FolderOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

export default function Layout({ children }) {
  const location = useLocation();

  const { data: patientsEnAttente } = useQuery({
    queryKey: ['patients-en-attente'],
    queryFn: async () => {
      const allPatients = await base44.entities.Patient.list();
      return allPatients.filter(p => p.statut_salle_attente !== 'termine');
    },
    refetchInterval: 30000,
    initialData: [],
  });

  const navigationItems = [
    {
      title: "Salle d'attente",
      url: createPageUrl("SalleAttente"),
      icon: ClipboardList,
    },
    {
      title: "Patients",
      url: createPageUrl("Patients"),
      icon: Users,
    },
    {
      title: "Dossiers récents",
      url: createPageUrl("DossiersRecents"),
      icon: FolderOpen,
    },
    {
      title: "Dossiers à traiter",
      url: createPageUrl("DossiersATraiter"),
      icon: FileText,
    },
    {
      title: "Recherche avancée",
      url: createPageUrl("RechercheAvancee"),
      icon: Settings,
    },
    {
      title: "Recettes",
      url: createPageUrl("Recettes"),
      icon: DollarSign,
    },
    {
      title: "Utilisateurs",
      url: createPageUrl("GestionUtilisateurs"),
      icon: Users,
    },
    {
      title: "Gestion",
      url: createPageUrl("Gestion"),
      icon: Settings,
    },
  ];

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      <div className="w-64 bg-white border-r border-gray-200 fixed left-0 top-0 h-full z-50">
        <div className="border-b border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">OphtalmoPro</h2>
              <p className="text-xs text-gray-500">Cabinet d'ophtalmologie</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <div className="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wider px-2 py-2">
            Navigation
          </div>
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={item.title}
                  to={item.url}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors duration-200 ${
                    isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <main className="flex-1 flex flex-col ml-64">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <Link 
            to={createPageUrl("SalleAttente")}
            className="flex items-center gap-2 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
          >
            <ClipboardList className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-gray-700">Salle d'attente</span>
            {patientsEnAttente.length > 0 && (
              <Badge className="bg-red-500 text-white">
                {patientsEnAttente.length}
              </Badge>
            )}
          </Link>
        </div>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
