# Mon Maître — Gestion des interrogations mathématiques

Application web pour les professeurs de mathématiques : chargez vos classes et questions depuis un fichier Excel, sélectionnez les élèves, générez des questions aléatoires et exportez les notes.

## Structure du fichier Excel

Votre fichier Excel doit contenir :

- **Feuilles de classe** : `class_A`, `class_B`, etc.
  - Colonnes : `student_name`, `group`, `grade`

- **Feuilles de questions** : `questions_A`, `questions_B`, etc. (correspondant à chaque classe)
  - Colonnes : `question_description`, `difficulty`, `week` (optionnel — semaine où poser la question)

## Démarrage

```sh
# Générer le fichier exemple (à faire une fois)
npm run generate-example

# Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:4321](http://localhost:4321).

## Utilisation

1. **Charger le fichier** — Choisissez votre Excel ou cliquez sur « Charger l'exemple »
2. **Sélectionner la classe** — Choisissez parmi les classes détectées
3. **Sélectionner les élèves** — Toute la classe, par groupe, ou manuellement (multi-sélection)
4. **Générer les questions** — Définissez le nombre de questions par élève et générez
5. **Saisir les notes** — Entrez la note de chaque élève (/20)
6. **Télécharger** — Exportez l'Excel mis à jour avec les notes

## Commandes

| Commande | Action |
|----------|--------|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run generate-example` | Génère `public/example-classes.xlsx` |
