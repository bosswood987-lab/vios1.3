const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class EntityAPI {
  constructor(entityName) {
    this.entityName = entityName;
  }

  async list(sort = '-created_date', limit = 1000) {
    const response = await fetch(`${API_BASE_URL}/${this.entityName}`);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    
    if (sort.startsWith('-')) {
      const field = sort.substring(1);
      return data.sort((a, b) => new Date(b[field]) - new Date(a[field])).slice(0, limit);
    }
    return data.sort((a, b) => new Date(a[sort]) - new Date(b[sort])).slice(0, limit);
  }

  async filter(query, sort = '-created_date', limit = 1000) {
    const data = await this.list(sort, limit);
    return data.filter(item => {
      return Object.entries(query).every(([key, value]) => item[key] === value);
    });
  }

  async get(id) {
    const response = await fetch(`${API_BASE_URL}/${this.entityName}/${id}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return await response.json();
  }

  async create(data) {
    const response = await fetch(`${API_BASE_URL}/${this.entityName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create');
    }
    return await response.json();
  }

  async bulkCreate(dataArray) {
    const promises = dataArray.map(data => this.create(data));
    return await Promise.all(promises);
  }

  async update(id, data) {
    const response = await fetch(`${API_BASE_URL}/${this.entityName}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update');
    }
    return await response.json();
  }

  async delete(id) {
    const response = await fetch(`${API_BASE_URL}/${this.entityName}/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Failed to delete');
    return await response.json();
  }

  async schema() {
    return { type: 'object', properties: {} };
  }
}

export const base44 = {
  entities: {
    Patient: new EntityAPI('Patient'),
    ExamenOrthoptiste: new EntityAPI('ExamenOrthoptiste'),
    ExamenOphtalmologie: new EntityAPI('ExamenOphtalmologie'),
    Imagerie: new EntityAPI('Imagerie'),
    Ordonnance: new EntityAPI('Ordonnance'),
    Courrier: new EntityAPI('Courrier'),
    Conclusion: new EntityAPI('Conclusion'),
    ModeleOrdonnance: new EntityAPI('ModeleOrdonnance'),
    ModeleCourrier: new EntityAPI('ModeleCourrier'),
    ActeMedical: new EntityAPI('ActeMedical'),
    Cotation: new EntityAPI('Cotation'),
    RaccourciExamen: new EntityAPI('RaccourciExamen'),
    AssociationCotation: new EntityAPI('AssociationCotation'),
    Traitement: new EntityAPI('Traitement'),
    LentilleContact: new EntityAPI('LentilleContact'),
    VerresPrescrit: new EntityAPI('VerresPrescrit'),
    PrescriptionLentille: new EntityAPI('PrescriptionLentille'),
    RaccourciOverviewOphtalmo: new EntityAPI('RaccourciOverviewOphtalmo'),
    MegaRaccourci: new EntityAPI('MegaRaccourci'),
    DossierATraiter: new EntityAPI('DossierATraiter'),
    IVT: new EntityAPI('IVT'),
    TypeVerres: new EntityAPI('TypeVerres'),
    Consultation: new EntityAPI('Consultation'),
    User: new EntityAPI('User')
  },

  auth: {
    async me() {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`);
        if (!response.ok) return { email: 'default@user.com', specialite: 'admin', full_name: 'Utilisateur' };
        return await response.json();
      } catch {
        return { email: 'default@user.com', specialite: 'admin', full_name: 'Utilisateur' };
      }
    },

    async updateMe(data) {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return await response.json();
    },

    async isAuthenticated() {
      return true;
    },

    logout(redirectUrl) {
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.reload();
    },

    redirectToLogin(nextUrl) {
      // Pas de login requis en local
    }
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) throw new Error('Failed to upload file');
        return await response.json();
      },

      async InvokeLLM({ prompt, response_json_schema }) {
        console.warn('LLM integration pas implémentée en local');
        return response_json_schema ? {} : 'Non disponible en local';
      },

      async GenerateImage({ prompt }) {
        console.warn('Génération d\'images pas implémentée en local');
        return { url: 'https://via.placeholder.com/400' };
      }
    }
  }
};