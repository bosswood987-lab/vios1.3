# Système d'Abréviations Automatiques

## Description

Le système d'abréviations permet de transformer automatiquement des abréviations courtes en texte complet lors de la saisie dans les champs de texte. Par exemple, taper "ppn" suivi d'un espace se transforme automatiquement en "pôle postérieur normal".

## Fonctionnalités

- **Expansion automatique** : Les abréviations sont remplacées automatiquement lorsque vous tapez un espace ou appuyez sur Entrée après une abréviation
- **Insensible à la casse** : Les abréviations fonctionnent en minuscules ou en majuscules
- **Gestion centralisée** : Création et gestion des abréviations via l'interface de gestion
- **Abréviations globales** : Les abréviations peuvent être partagées avec tous les utilisateurs ou limitées à l'utilisateur qui les a créées
- **Intégration transparente** : Fonctionne dans tous les champs de texte compatibles de l'application

## Configuration

### Installation de la base de données

1. Exécutez le script de schéma pour créer la table `abbreviation` :
```bash
psql $DATABASE_URL -f ophtalmo-backend/schema.sql
```

2. Optionnel : Chargez les abréviations par défaut :
```bash
psql $DATABASE_URL -f ophtalmo-backend/migrations/add-default-abbreviations.sql
```

### Abréviations par défaut

Le système est livré avec un ensemble d'abréviations médicales courantes en ophtalmologie :

- `ppn` → pôle postérieur normal
- `ras` → rien à signaler
- `av` → acuité visuelle
- `pio` → pression intraoculaire
- `dmla` → dégénérescence maculaire liée à l'âge
- Et bien d'autres...

## Utilisation

### Pour les utilisateurs finaux

1. **Naviguer vers la page de gestion** : Allez dans le menu Gestion
2. **Sélectionner l'onglet "Abréviations"**
3. **Créer une nouvelle abréviation** :
   - Cliquer sur "Ajouter une abréviation"
   - Entrer l'abréviation (ex: "ppn")
   - Entrer le texte complet (ex: "pôle postérieur normal")
   - Ajouter une description optionnelle
   - Cocher "Abréviation globale" si elle doit être disponible pour tous
   - Cliquer sur "Enregistrer"

4. **Utiliser une abréviation** :
   - Dans n'importe quel champ de texte compatible (lampe à fente, fond d'œil, diagnostic, etc.)
   - Taper l'abréviation (ex: "ppn")
   - Appuyer sur Espace ou Entrée
   - L'abréviation est automatiquement remplacée par le texte complet

### Pour les développeurs

#### Composants disponibles

```jsx
import { TextareaWithAbbreviations } from "@/components/ui/textarea-with-abbreviations";
import { InputWithAbbreviations } from "@/components/ui/input-with-abbreviations";
```

#### Utilisation dans un composant

```jsx
import { TextareaWithAbbreviations } from "@/components/ui/textarea-with-abbreviations";

function MonComposant() {
  const [currentUser, setCurrentUser] = useState(null);
  const [value, setValue] = useState("");

  return (
    <TextareaWithAbbreviations
      value={value}
      onChange={(e) => setValue(e.target.value)}
      currentUserId={currentUser?.email}
      placeholder="Entrez votre texte..."
    />
  );
}
```

#### Hook personnalisé

Le hook `useAbbreviationExpansion` peut être utilisé pour ajouter la fonctionnalité d'expansion à n'importe quel composant :

```jsx
import { useAbbreviationExpansion } from "@/hooks/useAbbreviationExpansion";

function MonComposantPersonnalise() {
  const { handleKeyPress, abbreviationsCount } = useAbbreviationExpansion(currentUser?.email);
  
  return (
    <textarea
      onKeyDown={(e) => handleKeyPress(e, value, setValue)}
      // ... autres props
    />
  );
}
```

## Architecture technique

### Backend

- **Table** : `abbreviation` dans PostgreSQL
- **Champs** :
  - `id` (UUID) : Identifiant unique
  - `abbreviation` (VARCHAR) : L'abréviation courte
  - `full_text` (TEXT) : Le texte complet de remplacement
  - `description` (VARCHAR) : Description optionnelle
  - `is_global` (BOOLEAN) : Si l'abréviation est disponible pour tous
  - `created_by` (VARCHAR) : Email de l'utilisateur créateur
  - `created_date`, `updated_date` : Horodatages

- **API** : Endpoints CRUD standard via `/api/Abbreviation`

### Frontend

- **Hook** : `useAbbreviationExpansion.js` - Logique d'expansion et gestion du cache
- **Composants** :
  - `TextareaWithAbbreviations` - Textarea avec expansion automatique
  - `InputWithAbbreviations` - Input avec expansion automatique
- **Gestion** : Interface dans `Gestion.jsx` pour créer/supprimer les abréviations

### Algorithme d'expansion

1. Détection d'un événement clavier (Espace ou Entrée)
2. Extraction du dernier mot avant le curseur
3. Recherche dans le dictionnaire d'abréviations (insensible à la casse)
4. Remplacement du mot par le texte complet si trouvé
5. Positionnement du curseur après le texte expansé

## Bonnes pratiques

- **Abréviations courtes** : Utilisez des abréviations de 2-5 caractères pour une saisie rapide
- **Cohérence** : Établissez des conventions pour les abréviations dans votre équipe
- **Descriptions** : Ajoutez toujours une description pour faciliter la gestion
- **Global vs Personnel** : Utilisez les abréviations globales pour les termes médicaux standards, et personnelles pour vos préférences individuelles
- **Éviter les conflits** : N'utilisez pas d'abréviations qui sont des mots courants en français

## Dépannage

### L'expansion ne fonctionne pas

1. Vérifiez que `currentUserId` est bien passé au composant
2. Vérifiez que l'abréviation existe dans la base de données
3. Vérifiez que l'abréviation est globale ou créée par l'utilisateur actuel
4. Assurez-vous que le champ n'est pas en mode `disabled`

### Conflits d'abréviations

Si deux abréviations identiques existent (une globale et une personnelle), l'expansion utilisera la première trouvée. Pour résoudre :
- Supprimez l'abréviation en doublon
- Utilisez une abréviation différente

## Évolutions futures possibles

- Import/export d'abréviations
- Catégorisation des abréviations par spécialité
- Suggestions d'abréviations lors de la saisie
- Historique d'utilisation des abréviations
- Synchronisation avec des bibliothèques médicales standards

## Support

Pour toute question ou problème, contactez le support technique ou consultez la documentation complète du projet.
