GCD USMBA — Gestion du Cycle Doctoral
Prototype de plateforme web pour la préinscription et l’inscription au cycle doctoral.
Ce projet présente une interface de démonstration pour accompagner les candidats, les commissions de sélection et l’administration dans le traitement des candidatures au doctorat. Son fonctionnement est illustré par un diagramme d’activité UML et des captures d’écran.
Avertissement : projet de démonstration à vocation pédagogique, non officiel. Il ne remplace pas le portail institutionnel de l’Université Sidi Mohamed Ben Abdellah (USMBA). Les dates, quotas, profils, dossiers et résultats visibles dans la démo sont des exemples et ne constituent pas des informations administratives officielles.
Objectifs
Centraliser les étapes de préinscription et d’inscription au doctorat.
Aider les candidats à préparer, sauvegarder et suivre leur dossier.
Faciliter l’examen des candidatures par sujet de thèse.
Présenter les entretiens, les évaluations, les classements et les décisions.
Illustrer la validation administrative de l’inscription définitive.
Fonctionnalités présentées
Espace candidat
Consultation du catalogue de sujets de thèse et de leurs prérequis.
Sélection de trois sujets et définition de l’ordre de priorité.
Saisie des informations personnelles et du parcours universitaire.
Enregistrement et suivi de l’avancement du dossier (brouillon, soumission, etc.).
Dépôt de pièces justificatives et indication de leur statut.
Réception de notifications relatives au dossier et aux décisions.
Espace commission de sélection
Visualisation des candidatures regroupées par sujet.
Examen des dossiers et des choix exprimés par les candidats.
Consultation du planning des entretiens.
Évaluation, classement, liste principale et liste d’attente.
Présentation de fonctions d’export des listes en CSV.
Espace administration (parcours illustré)
Suivi des candidatures et des décisions.
Paramétrage des règles et des pièces exigées dans la démonstration.
Vérification et validation des dossiers d’inscription définitive.
Les captures montrent l’interface du prototype. Elles ne garantissent pas, à elles seules, le fonctionnement d’un serveur de production, d’une authentification réelle ou d’une base de données persistante.
Diagramme d’activité UML
Le diagramme décrit les interactions entre Candidat, Plateforme GCD, Commission et Administration, depuis la création du dossier jusqu’à la validation administrative.
Diagramme d’activité de la préinscription et inscription GCD
Aperçu de la plateforme
1. Page d’accueil
Page d’accueil
2. Catalogue des sujets de thèse
Catalogue des sujets
3. Présentation des espaces de démonstration
Espaces candidat, commission et administration
4. Suivi et progression d’une candidature
Suivi d’une candidature
<details> <summary><strong>Voir les autres captures de l’espace candidat</strong></summary>
Informations et parcours
Formulaire de candidature
Choix des sujets
Choix des trois sujets
Pièces justificatives
Dépôt des pièces justificatives
Notifications
Notifications
Conseils aux candidats
Conseils aux candidats
</details>
<details> <summary><strong>Voir les captures de l’espace commission de sélection</strong></summary>
Candidatures regroupées par sujet
Candidatures par sujet
Examen des candidatures
Examen des candidatures
Planning des entretiens
Planning des entretiens
Évaluation et classement
Évaluation et classement
</details>
Déroulement général
Le candidat consulte les sujets et prépare son compte et son dossier.
Il complète ses informations, classe trois sujets et dépose ses pièces.
La plateforme enregistre sa candidature.
La commission examine le dossier et organise les entretiens si la candidature est présélectionnée.
La commission évalue et classe les candidats par sujet.
Le candidat retenu fournit les éléments demandés pour l’inscription définitive.
L’administration vérifie les pièces et valide l’inscription lorsque le dossier est conforme.
Contexte technique
Type : prototype d’application web.
Conception et prototypage : Google AI Studio.
Gestion du code source : GitHub.
Documentation : Markdown et diagramme d’activité UML.
Les bibliothèques, le framework, les commandes d’exécution et les éventuels services externes doivent être vérifiés à partir du code source du dépôt avant de les préciser ici.
Organisation des éléments de documentation
.
├── README.md
├── diagramme_acteurs_GCD.png
└── screenshots/
    ├── accueil.png
    ├── catalogue-sujets.png
    ├── espaces-demo.png
    ├── suivi-candidature.png
    ├── informations-parcours.png
    ├── choix-sujets.png
    ├── pieces-justificatives.png
    ├── notifications.png
    ├── conseils-candidats.png
    ├── commission-par-sujet.png
    ├── examen-candidatures.png
    ├── planning-entretiens.png
    └── evaluation-classement.png
Les autres fichiers du dépôt contiennent le code source de l’application.
Statut du projet
Prototype de démonstration : parcours et interfaces présentés à titre d’illustration. Les validations et tests de production restent à réaliser selon les besoins du projet.
Auteur
Projet pédagogique — Auteur / équipe : à compléter.
