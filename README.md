# Xtrunn

Catalogue de logiciels, extensions, utilitaires, jeux et applications. Le site est statique et hébergé sur GitHub Pages.

[Voir le site Xtrunn](https://xtrunn.github.io/xtrunn-site/)

## Proposer un projet depuis le site

Ouvrez **Projets → Proposer un projet**. Le formulaire affiche un aperçu et prépare la fiche JSON. Le bouton **Préparer l’envoi sur GitHub** ouvre une proposition publique à compléter avec le logo. Connectez-vous à GitHub et envoyez-la pour que Xtrunn la vérifie. Le bouton **Télécharger la fiche JSON** permet de récupérer la fiche directement.

## Ajouter un projet au catalogue

1. Ajoutez son logo dans `assets/projects/`. Les formats PNG, WebP et JPEG sont acceptés.
2. Copiez `catalog/kleyris.json` dans un nouveau fichier, par exemple `catalog/mon-projet.json`. Donnez à `id` le même nom que le fichier, sans `.json`.
3. Renseignez les informations du projet. Les catégories possibles sont `software`, `extension`, `utility`, `game`, `app` et `other`. Le champ `publisher` donne le nom de l’éditeur sur la fiche.
4. Utilisez `"status": "upcoming"` et `"downloads": []` si le projet est en préparation. Quand il est disponible, passez le statut à `available` et renseignez un ou plusieurs liens HTTPS vers une boutique, une page de version ou un fichier.

   Exemple de liste de liens à adapter au projet

   ```json
   "downloads": [
     {"label": "Télécharger pour Windows", "url": "https://example.org/mon-projet"},
     {"label": "Voir sur GitHub", "url": "https://github.com/organisation/projet/releases"}
   ]
   ```

5. Depuis le dépôt, exécutez `python build_catalog.py` avec Python 3. Ouvrez `index.html` dans votre navigateur. Ajoutez au commit la fiche JSON, le logo et les pages générées. `python build_catalog.py --check` permet de vérifier que ces pages sont à jour.

Les modèles sont dans `templates/`. Le script génère l’accueil et une page par projet, accessible via `products/<id>.html`. Pour supprimer un projet, retirez sa fiche JSON et sa page HTML générée, puis relancez le script.

## Contributions

Un autre éditeur peut envoyer sa fiche depuis le formulaire ou la proposer via une pull request. Le mainteneur doit vérifier l’identité de l’éditeur, ses droits sur le logo et la destination de chaque lien avant de fusionner. Le générateur vérifie les champs, les catégories et le format des liens. GitHub Pages sert les pages validées. Une publication sans passer par GitHub demandera des comptes et une file de modération sur le site.

## Publication

Dans **Settings → Pages**, configurez **Deploy from a branch**, branche `main` et dossier `/(root)`. Après fusion ou envoi sur `main`, GitHub Pages publie les fichiers statiques.
