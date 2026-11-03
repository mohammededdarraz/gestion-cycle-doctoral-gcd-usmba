
# GCD USMBA — Gestion du Cycle Doctoral

**Plateforme web de préinscription, de sélection et d'inscription au cycle doctoral**

**Université Sidi Mohamed Ben Abdellah — Fès**

> Projet académique de conception et de développement d'une plateforme de gestion du cycle doctoral. Prototype pédagogique non officiel.

---

## Présentation du projet

GCD USMBA est une application web destinée à faciliter la gestion des candidatures au cycle doctoral.

La plateforme centralise les opérations de préinscription, de sélection, de suivi des dossiers et d'inscription définitive.

Elle propose une interface simple, moderne et intuitive, organisée autour de trois espaces :

- **Espace Candidat**
- **Espace Commission de sélection**
- **Espace Administration CEDoc**

## Objectifs

- Digitaliser le processus de préinscription et d'inscription.
- Simplifier la gestion des dossiers de candidature.
- Permettre la sélection de trois sujets de thèse par ordre de priorité.
- Faciliter l'examen et le classement des candidatures.
- Gérer les entretiens et les résultats de sélection.
- Informer les candidats des changements de leur dossier.
- Assurer le suivi des documents, des corrections et des délais.
- Centraliser les opérations administratives.

---

## Fonctionnalités principales

### 1. Espace Candidat

- Création d'un compte et connexion.
- Consultation du catalogue des sujets de thèse.
- Préinscription en ligne.
- Saisie des informations personnelles et universitaires.
- Sélection de trois sujets par ordre de priorité.
- Dépôt des pièces justificatives.
- Enregistrement du dossier en brouillon.
- Suivi de la progression et du statut.
- Consultation des notifications.
- Correction des documents non conformes.
- Consultation des convocations et des résultats.

### 2. Espace Commission de sélection

- Consultation des candidatures.
- Regroupement des candidatures par sujet.
- Examen des dossiers universitaires.
- Vérification des pièces justificatives.
- Présélection des candidats.
- Gestion du planning des entretiens.
- Évaluation des dossiers et des entretiens.
- Classement des candidats par sujet.
- Gestion des listes principales et d'attente.
- Exportation des résultats au format CSV.
- Consultation des notifications.

### 3. Espace Administration CEDoc

- Tableau de bord général.
- Suivi des candidatures et des inscriptions.
- Vérification et validation des documents.
- Demandes de correction avec justification.
- Gestion et prolongation des délais.
- Envoi de notifications et d'annonces.
- Gestion des sujets de thèse.
- Configuration du calendrier universitaire.
- Paramétrage des règles de sélection.
- Gestion des utilisateurs.
- Suivi des demandes de support.
- Validation des inscriptions définitives.

---

## Système de notifications et gestion des délais

La plateforme intègre un système de notifications permettant d'informer les utilisateurs des événements importants.

### Notifications

- Changement du statut d'une candidature.
- Publication des résultats.
- Convocation à un entretien.
- Modification d'une date importante.
- Document manquant ou non conforme.
- Demande de correction.
- Prolongation d'un délai.
- Rappel avant une date limite.

### Gestion des délais

L'administration peut définir une date limite pour corriger un document et préciser le motif de régularisation.

Les candidats peuvent consulter les délais associés à leurs dossiers.

Le système prévoit des rappels configurables :

- **J-7** : sept jours avant l'échéance.
- **J-3** : trois jours avant l'échéance.
- **J-1** : un jour avant l'échéance.

Les notifications internes sont prévues dans l'application. L'envoi d'e-mails nécessite une configuration SMTP et le fonctionnement du backend.

---

# Captures d'écran de l'application

## I. Interface publique et Espace Candidat

### 1. Page d'accueil

![Accueil GCD USMBA](screenshots/candidat/01-accueil.png)

### 2. Catalogue des sujets de thèse

![Catalogue des sujets](screenshots/candidat/02-catalogue-sujets.png)

### 3. Connexion

![Page de connexion](screenshots/candidat/03-connexion.png)

### 4. Préinscription

![Formulaire de préinscription](screenshots/candidat/04-preinscription.png)

### 5. Tableau de bord du candidat

![Tableau de bord candidat](screenshots/candidat/05-tableau-bord-candidat.png)

### 6. Gestion du dossier

![Dossier de candidature](screenshots/candidat/06-dossier-candidat.png)

### 7. Choix des sujets de thèse

![Choix des sujets](screenshots/candidat/07-choix-sujets.png)

### 8. Pièces justificatives

![Pièces jointes](screenshots/candidat/08-pieces-jointes.png)

### 9. Notifications du candidat

![Notifications candidat](screenshots/candidat/09-notifications.png)

---

## II. Espace Commission de sélection

### 10. Examen des candidatures

![Examen des candidatures](screenshots/commission/10-candidatures-commission.png)

### 11. Candidatures regroupées par sujet

![Candidatures par sujet](screenshots/commission/11-par-sujet-commission.png)

### 12. Planning des entretiens

![Planning des entretiens](screenshots/commission/12-entretiens-commission.png)

### 13. Évaluation et classement

![Classement par sujet](screenshots/commission/13-classement-commission.png)

### 14. Notifications de la commission

![Notifications commission](screenshots/commission/14-notifications-commission.png)

---

## III. Espace Administration

### 15. Tableau de bord administratif

![Vue d'ensemble administration](screenshots/administration/15-vue-ensemble-administration.png)

### 16. Gestion des candidatures et pièces

![Gestion des candidatures](screenshots/administration/16-candidatures-pieces-administration.png)

### 17. Notifications et annonces

![Notifications administration](screenshots/administration/17-notifications-annonces-administration.png)

### 18. Gestion des sujets de thèse

![Gestion des sujets](screenshots/administration/18-sujets-administration.png)

### 19. Paramètres et règles de sélection

![Paramètres de la campagne](screenshots/administration/19-parametres-administration.png)

### 20. Gestion des utilisateurs

![Gestion des utilisateurs](screenshots/administration/20-utilisateurs-administration.png)

### 21. Gestion du support

![Support administration](screenshots/administration/21-support-administration.png)

# Modélisation UML

La modélisation UML permet de représenter le fonctionnement de la plateforme, les différents états d'une candidature et la structure des données.

## 1. Diagramme d'activité

Représentation du processus de préinscription, de sélection et d'inscription au cycle doctoral.

![Diagramme d'activité GCD](diagrammes/diagramme-activite-gcd.png)

## 2. Diagramme d'états-transitions

Représentation des différents états possibles d'une candidature, depuis sa création jusqu'à la décision finale et l'inscription.

![Diagramme d'états-transitions GCD](diagrammes/diagramme-etats-transitions-gcd.png)

## 3. Diagramme de classes

Représentation simplifiée des principales classes métier et de leurs relations.

![Diagramme de classes GCD](diagrammes/diagramme-classes-gcd-simple.png)

---

---

