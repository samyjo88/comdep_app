# Checklist de tests manuels — ComDept

> Dernière mise à jour : 2026-05-07  
> Pour chaque scénario : ✅ OK · ❌ Échec · ⚠️ Partiel · — Non testé

---

## 1. Navigation globale

| # | Scénario | Résultat |
|---|----------|----------|
| N-01 | Page d'accueil (`/`) — le bouton "Commencer" redirige vers `/dashboard` | — |
| N-02 | Clic sur le logo "ComDept" dans la navbar → `/dashboard` | — |
| N-03 | Menu hamburger (mobile ≤ 640 px) : tous les liens de module s'ouvrent | — |
| N-04 | Lien "Sonorisation" → `/sonorisation` | — |
| N-05 | Lien "Projection / Proclaim" → `/projection` | — |
| N-06 | Lien "Annonces" → `/annonces` | — |
| N-07 | Lien "Captation Vidéo" → `/captation` | — |
| N-08 | Lien "Community Management" → `/community` | — |
| N-09 | Avatar utilisateur → dropdown visible (nom, e-mail, "Mon profil", "Se déconnecter") | — |
| N-10 | "Mon profil" dans le dropdown → `/profil` | — |

---

## 2. Navigation Sonorisation

| # | Scénario | Résultat |
|---|----------|----------|
| S-01 | Onglet "Inventaire" → `/sonorisation/inventaire` | — |
| S-02 | Onglet "Matériel" → `/sonorisation/materiel` | — |
| S-03 | Onglet "Équipe" → `/sonorisation/equipe` | — |
| S-04 | Onglet "Planning" → `/sonorisation/planning` | — |
| S-05 | Breadcrumb "Sonorisation" dans la barre de module → `/sonorisation` | — |

---

## 3. Navigation Annonces

| # | Scénario | Résultat |
|---|----------|----------|
| A-01 | Onglet "Nouveau culte" → `/annonces/nouveau` | — |
| A-02 | Onglet "Historique" → `/annonces/historique` | — |
| A-03 | Onglet "Suivi reconduite" → `/annonces/suivi` (NE PAS pointer vers `/annonces/reconduite`) | — |
| A-04 | Clic sur une annonce dans l'historique → page de détail de l'annonce | — |

---

## 4. Navigation Captation

| # | Scénario | Résultat |
|---|----------|----------|
| C-01 | Onglet "Tableau de bord" → `/captation` | — |
| C-02 | Onglet "Planning" → `/captation/planning` | — |
| C-03 | Onglet "Équipe" → `/captation/equipe` | — |
| C-04 | Onglet "Médiathèque" → `/captation/mediatheque` | — |

---

## 5. Navigation Community Management

| # | Scénario | Résultat |
|---|----------|----------|
| CM-01 | Onglet "Tableau de bord" → `/community` | — |
| CM-02 | Onglet "Planning" → `/community/planning` | — |
| CM-03 | Onglet "Posts" → `/community/posts` | — |
| CM-04 | Onglet "Idées" → `/community/idees` | — |
| CM-05 | Onglet "Rapports" → `/community/rapports` | — |

---

## 6. Formulaires — Retour utilisateur

| # | Scénario | Résultat |
|---|----------|----------|
| F-01 | Ajouter un matériel (inventaire) avec champs valides → toast "Matériel ajouté avec succès" + dialogue fermé | — |
| F-02 | Ajouter un matériel sans le champ "Nom" → message d'erreur visible dans le formulaire | — |
| F-03 | Ajouter un membre sonorisation → toast "Membre ajouté" + modal fermé | — |
| F-04 | Modifier un membre sonorisation → toast "Membre mis à jour" + modal fermé | — |
| F-05 | Ajouter un membre captation → toast "Membre ajouté" + modal fermé | — |
| F-06 | Modifier un membre captation → toast "Membre mis à jour" + modal fermé | — |
| F-07 | Créer un post community → toast "Post créé" + panneau latéral fermé | — |
| F-08 | Modifier un post community → toast "Post mis à jour" + panneau fermé | — |
| F-09 | Supprimer un post (après confirmation) → toast "Post supprimé" + liste mise à jour | — |
| F-10 | Changer le statut d'un post (select) → rafraîchissement sans erreur visible | — |
| F-11 | Ajouter une idée community → toast "Idée ajoutée" + panneau fermé | — |
| F-12 | Changer le statut d'une idée → rafraîchissement silencieux (pas de toast attendu) | — |
| F-13 | Mise à jour du profil utilisateur (prénom/nom) → toast "Profil mis à jour" | — |
| F-14 | Changement de mot de passe avec confirmation incorrecte → message d'erreur | — |
| F-15 | Changement de mot de passe correct (≥ 8 car.) → toast "Mot de passe mis à jour" | — |
| F-16 | Toggle notifications e-mail → switch change d'état immédiatement | — |

---

## 7. États vides

| # | Scénario | Résultat |
|---|----------|----------|
| E-01 | Inventaire matériel vide → message d'absence + bouton "Ajouter du matériel" | — |
| E-02 | Équipe sonorisation vide → message "Aucun membre" + bouton d'ajout | — |
| E-03 | Planning sonorisation vide → message informatif | — |
| E-04 | Idées community vides → illustration + message + bouton "Ajouter une idée" | — |
| E-05 | Posts community vides → message "Aucun post pour cette sélection" | — |
| E-06 | Kanban community — colonne vide → affiche "Aucun post" dans la colonne | — |
| E-07 | Équipe captation vide → message "Aucun membre" | — |
| E-08 | Planning captation sans culte → message informatif | — |
| E-09 | Notifications (cloche) vide → "Tout est à jour / Aucune notification" | — |
| E-10 | Module Profil — aucun module détecté → "Aucune affectation à un module détectée" | — |

---

## 8. Chargement (skeleton)

| # | Scénario | Résultat |
|---|----------|----------|
| L-01 | Navigation vers `/dashboard` → skeleton animé visible pendant le chargement | — |
| L-02 | Navigation vers `/profil` → skeleton grille visible | — |
| L-03 | Navigation vers `/sonorisation/inventaire` → skeleton table visible (loading.tsx existe) | — |
| L-04 | Navigation vers `/annonces` → skeleton liste visible | — |
| L-05 | Navigation vers `/captation` → skeleton grille visible | — |
| L-06 | Navigation vers `/community` → skeleton visible | — |
| L-07 | Chaque page avec `Suspense` interne affiche son skeleton avant les données | — |

---

## 9. Erreurs Supabase

| # | Scénario | Résultat |
|---|----------|----------|
| SB-01 | Requête Supabase échouée (ex : réseau coupé) → message d'erreur friendly affiché, pas d'écran blanc | — |
| SB-02 | Erreur sur `/sonorisation/equipe` → bandeau rouge "Erreur de chargement : ..." | — |
| SB-03 | Erreur sur `/sonorisation/inventaire` → bandeau rouge affiché | — |
| SB-04 | Erreur sur une action serveur (ex : `updateProfilAction`) → toast.error avec message | — |
| SB-05 | Erreur JS non capturée → page `error.tsx` affichée avec bouton "Réessayer" | — |

---

## 10. Authentification & droits d'accès

| # | Scénario | Résultat |
|---|----------|----------|
| AUTH-01 | Accès à `/dashboard` sans être connecté → redirection vers `/` | — |
| AUTH-02 | Accès à `/sonorisation` sans être connecté → redirection vers `/` | — |
| AUTH-03 | Accès à `/annonces` sans être connecté → redirection vers `/` | — |
| AUTH-04 | Accès à `/captation` sans être connecté → redirection vers `/` | — |
| AUTH-05 | Accès à `/community` sans être connecté → redirection vers `/` | — |
| AUTH-06 | Accès à `/profil` sans être connecté → redirection vers `/` | — |
| AUTH-07 | Clic sur "Se déconnecter" → session détruite, redirection vers `/` | — |
| AUTH-08 | Après déconnexion, retour arrière navigateur → ne peut pas accéder aux pages protégées | — |
| AUTH-09 | Routes cron (`/api/cron/*`) sans `CRON_SECRET` → 401 Unauthorized | — |
| AUTH-10 | Routes API (`/api/annonces/generer`) sans session → 401 Unauthorized | — |

---

## 11. Responsive (breakpoints)

| # | Scénario (testez à 375px / 768px / 1280px) | Résultat |
|---|----------|----------|
| R-01 | Dashboard 375px → cartes modules en 1 colonne | — |
| R-02 | Dashboard 768px → cartes en 2 colonnes | — |
| R-03 | Dashboard 1280px → cartes en 3 colonnes | — |
| R-04 | Inventaire 375px → table remplacée par cards empilées | — |
| R-05 | Posts community 375px → table remplacée par cards | — |
| R-06 | Formulaires 375px → champs en colonne simple | — |
| R-07 | Navbar 375px → hamburger visible, logo visible | — |
| R-08 | Onglets modules 375px → icônes seules (labels sr-only) | — |

---

## 12. Mode sombre / clair

| # | Scénario | Résultat |
|---|----------|----------|
| D-01 | Bouton toggle soleil/lune visible dans la navbar | — |
| D-02 | Passage en mode sombre → fond, textes, cartes adaptés | — |
| D-03 | Passage en mode clair → retour aux couleurs claires | — |
| D-04 | Préférence sauvegardée → rechargement de page conserve le thème | — |
| D-05 | Badges colorés (statut, module) ont leurs variantes `dark:` | — |
| D-06 | Notifications bell → badge rouge visible en mode sombre | — |

---

## 13. Notifications

| # | Scénario | Résultat |
|---|----------|----------|
| NF-01 | Cloche affiche le badge rouge avec le nombre de non-lues | — |
| NF-02 | Clic sur la cloche → panneau latéral s'ouvre avec la liste | — |
| NF-03 | Clic sur une notification avec lien → marque comme lue + ferme le panneau | — |
| NF-04 | Bouton "X" sur une notification sans lien → la marque comme lue | — |
| NF-05 | "Tout marquer comme lu" → toutes les notifications passent en lues | — |
| NF-06 | Realtime : une nouvelle notification apparaît sans rechargement | — |

---

*Légende : ✅ OK · ❌ Échec (noter la description du bug) · ⚠️ Partiel · — Non testé*
