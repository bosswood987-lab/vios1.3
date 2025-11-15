import Layout from "./Layout.jsx";

import SalleAttente from "./SalleAttente";

import Patients from "./Patients";

import DossierPatient from "./DossierPatient";

import Gestion from "./Gestion";

import GestionUtilisateurs from "./GestionUtilisateurs";

import Recettes from "./Recettes";

import DossiersRecents from "./DossiersRecents";

import RechercheAvancee from "./RechercheAvancee";

import DossiersATraiter from "./DossiersATraiter";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    SalleAttente: SalleAttente,
    
    Patients: Patients,
    
    DossierPatient: DossierPatient,
    
    Gestion: Gestion,
    
    GestionUtilisateurs: GestionUtilisateurs,
    
    Recettes: Recettes,
    
    DossiersRecents: DossiersRecents,
    
    RechercheAvancee: RechercheAvancee,
    
    DossiersATraiter: DossiersATraiter,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<SalleAttente />} />
                
                
                <Route path="/SalleAttente" element={<SalleAttente />} />
                
                <Route path="/Patients" element={<Patients />} />
                
                <Route path="/DossierPatient" element={<DossierPatient />} />
                
                <Route path="/Gestion" element={<Gestion />} />
                
                <Route path="/GestionUtilisateurs" element={<GestionUtilisateurs />} />
                
                <Route path="/Recettes" element={<Recettes />} />
                
                <Route path="/DossiersRecents" element={<DossiersRecents />} />
                
                <Route path="/RechercheAvancee" element={<RechercheAvancee />} />
                
                <Route path="/DossiersATraiter" element={<DossiersATraiter />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}