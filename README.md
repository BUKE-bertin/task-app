<<<<<<< HEAD
# task-app
application de gestion de tache personnel 
=======
# Gestionnaire de tâches léger (PWA)

Petit projet demo : application de tâches légère, stockage local, synchronisation optionnelle avec Firebase Firestore et configuration PWA.

Installation & usage
- Ouvrir `index.html` dans un serveur local (recommandé) :

```bash
# Serveur simple avec Python
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

Fonctionnalités
- Ajouter / modifier / supprimer des tâches
- Stockage local (`localStorage`)
- Sync optionnelle Firestore : configurer `firebase.js` (exemples fournis)
- PWA : `manifest.json` + `sw.js` pour fonctionnement hors ligne

Activer Firestore
1. Créer un projet Firebase et ajouter une Web App
2. Copier la configuration dans `firebase.js` et décommenter l'implémentation example
3. Dans l'app, activer le toggle "Sync Firestore"

Notes
- L'application est conçue pour être un point de départ. La gestion des conflits côté Firestore est volontairement basique (dernier update gagne).
- Ajouter des images/icônes dans le dossier `images/` pour rendre la PWA installable proprement.
>>>>>>> 5e672b5 (Initial commit - gestion de taches)
