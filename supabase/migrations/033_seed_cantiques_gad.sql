-- ============================================================
--  033 — Cantiques GAD 1 à 5 (paroles complètes)  [idempotent]
--
--  Source : diaporamas de projection du département Projection
--           (GAD_1.pptx … GAD_5.pptx), une ligne de chant par slide,
--           regroupées ici par couplet.
--
--  Comportement :
--    · un cantique GAD dont le numéro n'existe pas encore est inséré ;
--    · s'il existe déjà mais sans paroles, seules les paroles sont
--      complétées (titre, thèmes et tags saisis par l'équipe sont
--      conservés) ;
--    · s'il existe déjà avec des paroles, rien n'est modifié.
--
--  Une seule instruction SQL, sans table temporaire : exécutable tel
--  quel dans le SQL Editor Supabase (pooler en mode transaction).
-- ============================================================

WITH s (numero_gad, titre, paroles) AS (VALUES
  ('1'::text, 'À toi, mon Dieu, mon cœur monte'::text,
'Couplet 1
À toi, mon Dieu, mon cœur monte ;
En toi mon espoir j’ai mis ;
Serai-je couvert de honte,
Au gré de mes ennemis ?
Jamais on n’est confondu,
Quand sur toi l’on se repose ;
Mais le méchant est perdu
Qui nuit aux justes sans cause.

Couplet 2
Ô Dieu, montre-moi la voie ;
Qui seule conduit à toi ;
Fais que je marche avec joie ;
Dans les sentiers de ta loi ;
Fais que je suive toujours ;
De ta vérité la route,
Toi qui de ton prompt secours,
Veux que jamais je ne doute.

Couplet 3
Souviens-toi de ta clémence,
Car elle fut de tout temps ;
Prends pitié de ma souffrance ;
C’est ta grâce que j’attends.
Mets loin de ton souvenir
Les péchés de ma jeunesse ;
Et daigne encor me bénir,
Seigneur, selon ta promesse.'),
  ('2', 'Bénissons Dieu, mon âme',
'Couplet 1
Bénissons Dieu, mon âme, en toute chose,
Lui sur qui seul tout mon espoir repose,
Chantons son nom sans nous lasser jamais.
Que tout en moi célèbre sa puissance,
Surtout, mon âme, exaltons sa clémence
Et n’oublions aucun de ses bienfaits.

Couplet 2
C’est ce grand Dieu qui, par sa pure grâce,
De tes péchés les souillures efface ;
Il te guérit de toute infirmité ;
Du tombeau même il retire ta vie,
Et rend tes jours encor dignes d’envie,
T’environnant partout de sa bonté.

Couplet 3
C’est ce grand Dieu dont la riche largesse
Te rassasie, et fait qu’en ta vieillesse
Ainsi qu’un aigle on te voit rajeunir ;
Juge équitable, à tout homme il accorde
Justice et droit, et sa miséricorde
Des opprimés daigne se souvenir.

Couplet 4
Comme à son fils un père est doux et tendre,
Si notre cœur vient au Seigneur se rendre,
Il nous reçoit avec compassion ;
Car il connaît de quoi sont faits les hommes,
Il sait, hélas ! il sait que nous ne sommes
Que poudre et cendre, et que corruption.

Couplet 5
Les jours de l’homme à l’herbe, je compare
Dont à nos yeux la campagne se pare,
Qu’un peu de temps a vu croître et mourir
Et qui soudain, de l’aquilon battue,
Tombe et se fane et n’est plus reconnue
Même du lieu qui la voyait flétrir.

Couplet 6
Mais tes faveurs, ô Dieu, sont éternelles
Pour qui t’invoque, et toujours les fidèles
De siècle en siècle éprouvent ta bonté.
Dieu garde ceux qui marchent en sa crainte,
Ceux dont le cœur s’attache à sa loi sainte,
Tous ceux enfin qui font sa volonté.

Couplet 7
Bénissez-le, célébrez ses louanges,
Hérauts puissants, chœurs immortels des anges,
Qui le servez aux demeures du ciel !
Que ses vertus, par vous soient proclamées ;
Bénissez-le, vous toutes ses armées !
Mon âme, adore et bénis l’Éternel !'),
  ('3', 'Comme un cerf altéré brame',
'Couplet 1
Comme un cerf altéré brame
Après le courant des eaux,
Ainsi soupire mon âme,
Seigneur, après tes ruisseaux
Elle a soif du Dieu vivant,
Et s’écrie en le suivant :
Ô mon Dieu, quand donc sera-ce
Que mes yeux verront ta face ?

Couplet 2
Pour pain je n’ai que mes larmes,
Et nuit et jour en tout lieu,
Lorsqu’en mes dures alarmes
On me dit : Que fait ton Dieu ?
Je regrette la saison
Où j’allais en ta maison,
Chantant avec les fidèles
Tes louanges immortelles.

Couplet 3
Mais quel chagrin te dévore ?
Mon âme, rassure-toi
Espère en Dieu, car encore
Il sera loué de moi.
C’est son regard seulement
Qui guérira mon tourment :
Mon Dieu, je sens que mon âme
D’un ardent désir se pâme.

Couplet 4
Tous les flots de ta colère
Sur moi, Seigneur, ont passé ;
Mais par ta grâce j’espère
Qu’enfin l’orage a cessé.
Le jour tu me conduiras,
Et la nuit tu me feras
Chanter, d’une âme ravie,
Ton saint nom, Dieu de ma vie.

Couplet 5
Mais quel chagrin te dévore ?
Mon âme, rassure-toi :
Espère en Dieu, car encore
Il sera loué de moi.
Un regard, dans sa faveur,
Me dit qu’il est mon Sauveur ;
Et c’est aussi lui, mon âme,
Qu’en tous mes maux je réclame.'),
  ('4', 'Il faut, grand Dieu',
'Couplet 1
Il faut, grand Dieu, que de mon cœur
La sainte ardeur
Te glorifie ;
Qu’à toi, des mains et de la voix
Devant les rois,
Je psalmodie.
J’irai t’adorer, ô mon Dieu,
En ton saint lieu
D’un nouveau zèle ;
Je chanterai ta vérité
Et ta bonté
Toujours fidèle.

Couplet 2
Ton nom est célèbre à jamais
Par les effets
De tes paroles,
Quand je t’invoque, tu m’entends
Quand il est temps,
Tu me consoles.
Tous les rois viendront à tes pieds,
Humiliés,
Prier sans cesse,
Sitôt qu’ils auront une fois
Ouï la voix
De ta promesse.

Couplet 3
Ils rempliront, par leurs concerts,
Tout l’univers
De tes louanges ;
Les peuples qui les entendront
Admireront
Tes faits étranges.
Ô grand Dieu qui, de tes hauts cieux,
En ces bas lieux
Vois toute chose,
Quoique tu sembles être loin,
C’est sur ton soin
Que tout repose.

Couplet 4
Si mon cœur, dans l’adversité,
Est agité,
Ta main m’appuie.
C’est ton bras qui sauve des mains
Des inhumains
Ma triste vie.
Quand je suis le plus abattu
C’est ta vertu
Qui me relève ;
Ce qu’il t’a plu de commencer
Sans se lasser
Ta main l’achève.'),
  ('5', 'J’aime, mon Dieu',
'Couplet 1
J’aime, mon Dieu, car son puissant secours
Montre qu’il a ma clameur entendue :
À mes soupirs son oreille est tendue ;
Je veux aussi l’invoquer tous les jours.

Couplet 2
Je n’avais plus ni trêve ni repos ;
Déjà la mort me tenait dans ses chaînes,
Mon cœur souffrait les plus cruelles peines,
Quand je lui fis ma prière en ces mots.

Couplet 3
« Ah ! sauve-moi du péril où je suis ! »
Et dès lors même il me fut favorable,
Il est toujours et juste et secourable,
Et toujours prompt à calmer nos ennuis.

Couplet 4
Quand j’étais prêt à périr de langueur,
Il me sauva, ce Dieu que je réclame !
Retourne donc en ton repos, mon âme,
Puisqu’il te fait éprouver sa faveur !

Couplet 5
Ta main puissante a détourné ma mort,
Séché mes pleurs, soutenu ma faiblesse ;
Sous tes yeux donc je veux marcher sans cesse,
Toute ma vie, ô mon Dieu, mon support.

Couplet 6
Je veux toujours obéir à tes lois,
Chanter ta gloire, invoquer ta puissance,
Et devant tous, plein de reconnaissance,
En hymnes saints faire éclater ma voix.')
),

-- Complément des paroles manquantes sur les cantiques déjà présents
upd AS (
  UPDATE public.cantiques c
     SET paroles = s.paroles
    FROM s
   WHERE c.categorie  = 'gad'
     AND c.numero_gad = s.numero_gad
     AND (c.paroles IS NULL OR btrim(c.paroles) = '')
  RETURNING c.numero_gad
)

-- Insertion des cantiques absents
INSERT INTO public.cantiques (categorie, numero_gad, titre, paroles, actif)
SELECT 'gad', s.numero_gad, s.titre, s.paroles, true
  FROM s
 WHERE NOT EXISTS (
   SELECT 1 FROM public.cantiques c
    WHERE c.categorie  = 'gad'
      AND c.numero_gad = s.numero_gad
 );
