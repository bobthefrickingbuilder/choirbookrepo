import type { Lang } from '@choirbook/shared/i18n';

// DRAFT legal wording for Matthew to review and approve (see docs/legal-review.md).
// It is shown with a "Draft" banner until he approves it; it is not legal advice.

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  list?: string[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/** Date of this draft, shown on the pages. */
export const LEGAL_DRAFT_DATE = '2026-10-17';
export const PRIVACY_CONTACT = 'Matthew Menard';

const privacyEn: LegalDoc = {
  title: 'Privacy policy',
  intro:
    'Choirbook is the website choirs use to run rehearsals, music, forms, fees and messages. This policy explains what personal information Choirbook holds, why, where it is kept, who can see it, and how you can see, correct or delete it. It applies to choristers, staff, and the parents or guardians of choristers under 18.',
  sections: [
    {
      heading: 'Who is responsible',
      paragraphs: [
        `Each choir decides what it collects about its members and is responsible for it. Choirbook keeps that information for the choir and follows the choir's instructions. The person in charge of privacy for Choirbook during the pilot is ${PRIVACY_CONTACT}. You can reach him with the Send feedback button in Choirbook, or through your choir office, which will pass your request on.`,
      ],
    },
    {
      heading: 'What we collect',
      list: [
        'Your name, preferred name, pronouns, email, phone, date of birth, language, and photo if you add one.',
        'Your choir details: section and voice part, membership status, attendance, absences you report, availability replies, practice progress, seats and volunteer shifts.',
        'Forms you fill in and sign, and the consents you give, with the date and the wording you saw.',
        'Medical or care information you or your guardian give the choir, such as allergies.',
        'Fees, payments and receipts. Card payments go through Stripe; Choirbook never sees or stores your card number.',
        'Messages you exchange with the choir office.',
        'For choristers under 18: one or two parent or guardian contacts (name, email, phone), and their signatures on forms, with the time and the network address they signed from.',
        'Technical records: when you sign in, and a log of who on staff viewed or changed member records.',
      ],
    },
    {
      heading: 'Why we use it',
      list: [
        'To run the choir: schedules, attendance, music, forms, fees, tickets and volunteers.',
        'To contact you about the choir, in the app and by email, as you choose in your notification settings.',
        'For choristers under 18, to send their guardians copies of the emails the choir chooses and to collect guardian signatures.',
        'To keep members safe, for example sharing medical information with chaperones on a trip, only if you agreed.',
        'To keep payment records that tax law requires.',
      ],
      paragraphs: ['We do not sell your information, we do not show advertising, and we never send your personal information to artificial intelligence services.'],
    },
    {
      heading: 'Who can see it',
      list: [
        'You can see everything Choirbook holds about you, and download it from your profile.',
        'Choir staff see what their role needs: for example, the treasurer sees fees, a section leader sees their section. Medical information is limited to staff with the care permission.',
        'Other members see only your name and section. Your email, phone and photo stay hidden from them unless you choose to share them.',
        'Staff notes about members are seen only by staff.',
        'Nobody in one choir can see another choir’s information.',
      ],
    },
    {
      heading: 'Where it is kept',
      paragraphs: [
        'The database and files (scores, recordings, photos) are stored in Canada, in Montreal, by our database provider Supabase. The website itself is run by Vercel; while you use it, your information passes through Vercel’s servers, which may be in the United States. Emails are sent through Resend and card payments through Stripe, which may also process information outside Canada. Encrypted backups are kept in a private location that only Choirbook’s administrator controls.',
      ],
    },
    {
      heading: 'How long we keep it',
      list: [
        'While you are a member, and for up to two years after you leave, so you can return easily. After that it is deleted, unless you ask sooner.',
        'Payment and receipt records are kept as long as tax law requires (usually six years), even after you leave or delete your account.',
        'Guardian contacts are no longer sent copies of choir emails after the chorister’s 18th birthday.',
      ],
    },
    {
      heading: 'Children and teens',
      paragraphs: [
        'Choirbook is for people 14 and over. Choristers aged 14 to 17 give their own consent, as Canadian and Quebec law allows. For choristers under 18, the choir also keeps a parent or guardian contact, who signs forms such as trip permissions through a secure link that works once and expires. Guardians do not need an account.',
      ],
    },
    {
      heading: 'Your choices and rights',
      list: [
        'See and download your information at any time (Profile → Your data).',
        'Correct your contact details on your profile, or ask your choir office to correct anything else.',
        'Give or withdraw optional consents, such as photos and video, on your profile at any time.',
        'Delete your account (Account settings → Delete my account). We email you a link to confirm first.',
        'Ask questions or complain to the privacy contact above. You can also contact the Office of the Privacy Commissioner of Canada, or in Quebec the Commission d’accès à l’information.',
      ],
    },
    {
      heading: 'Cookies',
      paragraphs: ['Choirbook uses only the cookies it needs to work: one to keep you signed in, and two to remember your language and light or dark appearance. There are no advertising or tracking cookies.'],
    },
    {
      heading: 'Security',
      paragraphs: [
        'Information travels encrypted. Each choir’s data is separated by rules in the database itself, staff access is limited by role, views and changes of member records are logged, files are served through short-lived private links, and sign-in attempts are limited. If a breach puts anyone at real risk of harm, we will tell the people affected and the privacy authorities, as the law requires.',
      ],
    },
    {
      heading: 'Changes',
      paragraphs: ['If this policy changes in a way that matters, we will tell members in the app before the change takes effect.'],
    },
  ],
};

const privacyFr: LegalDoc = {
  title: 'Politique de confidentialité',
  intro:
    'Choirbook est le site que les chœurs utilisent pour gérer les répétitions, la musique, les formulaires, les frais et les messages. Cette politique explique quels renseignements personnels Choirbook détient, pourquoi, où ils sont conservés, qui peut les voir, et comment les consulter, les corriger ou les supprimer. Elle s’applique aux choristes, au personnel et aux parents ou tuteurs des choristes de moins de 18 ans.',
  sections: [
    {
      heading: 'Qui est responsable',
      paragraphs: [
        `Chaque chœur décide de ce qu’il recueille au sujet de ses membres et en est responsable. Choirbook conserve ces renseignements pour le chœur et suit ses instructions. Pendant le projet pilote, la personne responsable de la protection des renseignements personnels pour Choirbook est ${PRIVACY_CONTACT}. Vous pouvez le joindre avec le bouton Envoyer un commentaire dans Choirbook, ou par le bureau de votre chœur, qui transmettra votre demande.`,
      ],
    },
    {
      heading: 'Ce que nous recueillons',
      list: [
        'Vos nom, nom d’usage, pronoms, courriel, téléphone, date de naissance, langue, et photo si vous en ajoutez une.',
        'Vos renseignements de chœur : pupitre et voix, statut de membre, présences, absences signalées, disponibilités, progrès de pratique, places et quarts de bénévolat.',
        'Les formulaires que vous remplissez et signez, et les consentements que vous donnez, avec la date et le texte que vous avez lu.',
        'Les renseignements médicaux ou de soins que vous ou votre parent ou tuteur donnez au chœur, comme les allergies.',
        'Les frais, paiements et reçus. Les paiements par carte passent par Stripe; Choirbook ne voit ni ne conserve votre numéro de carte.',
        'Les messages que vous échangez avec le bureau du chœur.',
        'Pour les choristes de moins de 18 ans : un ou deux parents ou tuteurs (nom, courriel, téléphone), et leurs signatures sur les formulaires, avec l’heure et l’adresse réseau d’où ils ont signé.',
        'Des données techniques : vos connexions, et un journal des membres du personnel qui ont consulté ou modifié des dossiers de membres.',
      ],
    },
    {
      heading: 'Pourquoi nous les utilisons',
      list: [
        'Pour faire fonctionner le chœur : horaires, présences, musique, formulaires, frais, billets et bénévolat.',
        'Pour communiquer avec vous au sujet du chœur, dans l’application et par courriel, selon vos préférences de notification.',
        'Pour les choristes de moins de 18 ans, envoyer à leurs parents ou tuteurs une copie des courriels choisis par le chœur et recueillir leurs signatures.',
        'Pour la sécurité des membres, par exemple communiquer des renseignements médicaux aux accompagnateurs d’un voyage, seulement si vous l’avez accepté.',
        'Pour conserver les registres de paiement exigés par les lois fiscales.',
      ],
      paragraphs: ['Nous ne vendons pas vos renseignements, nous n’affichons aucune publicité et nous n’envoyons jamais vos renseignements personnels à des services d’intelligence artificielle.'],
    },
    {
      heading: 'Qui peut les voir',
      list: [
        'Vous pouvez voir tout ce que Choirbook détient à votre sujet et le télécharger à partir de votre profil.',
        'Le personnel du chœur voit ce dont son rôle a besoin : par exemple, le trésorier voit les frais, un chef de pupitre voit son pupitre. Les renseignements médicaux sont réservés au personnel ayant la permission « soins ».',
        'Les autres membres ne voient que votre nom et votre pupitre. Votre courriel, votre téléphone et votre photo leur restent cachés, sauf si vous choisissez de les partager.',
        'Les notes du personnel sur les membres ne sont vues que par le personnel.',
        'Personne dans un chœur ne peut voir les renseignements d’un autre chœur.',
      ],
    },
    {
      heading: 'Où ils sont conservés',
      paragraphs: [
        'La base de données et les fichiers (partitions, enregistrements, photos) sont conservés au Canada, à Montréal, par notre fournisseur de base de données Supabase. Le site lui-même est exploité par Vercel; lorsque vous l’utilisez, vos renseignements passent par les serveurs de Vercel, qui peuvent se trouver aux États-Unis. Les courriels sont envoyés par Resend et les paiements par carte par Stripe, qui peuvent aussi traiter des renseignements à l’extérieur du Canada. Des copies de sauvegarde chiffrées sont conservées dans un endroit privé que seul l’administrateur de Choirbook contrôle.',
      ],
    },
    {
      heading: 'Durée de conservation',
      list: [
        'Pendant que vous êtes membre, et jusqu’à deux ans après votre départ, pour que vous puissiez revenir facilement. Ensuite, ils sont supprimés, à moins que vous le demandiez plus tôt.',
        'Les paiements et reçus sont conservés aussi longtemps que l’exigent les lois fiscales (habituellement six ans), même après votre départ ou la suppression de votre compte.',
        'Les parents ou tuteurs ne reçoivent plus de copies des courriels du chœur après le 18e anniversaire du choriste.',
      ],
    },
    {
      heading: 'Enfants et adolescents',
      paragraphs: [
        'Choirbook s’adresse aux personnes de 14 ans et plus. Les choristes de 14 à 17 ans donnent eux-mêmes leur consentement, comme le permettent les lois canadiennes et québécoises. Pour les choristes de moins de 18 ans, le chœur garde aussi un parent ou tuteur, qui signe des formulaires comme les autorisations de voyage au moyen d’un lien sécurisé qui ne fonctionne qu’une fois et expire. Les parents ou tuteurs n’ont pas besoin de compte.',
      ],
    },
    {
      heading: 'Vos choix et vos droits',
      list: [
        'Consulter et télécharger vos renseignements en tout temps (Profil → Vos données).',
        'Corriger vos coordonnées dans votre profil, ou demander au bureau du chœur de corriger tout autre renseignement.',
        'Donner ou retirer en tout temps les consentements facultatifs, comme les photos et vidéos, dans votre profil.',
        'Supprimer votre compte (Paramètres du compte → Supprimer mon compte). Nous vous envoyons d’abord un lien de confirmation par courriel.',
        'Poser des questions ou porter plainte auprès de la personne responsable ci-dessus. Vous pouvez aussi vous adresser au Commissariat à la protection de la vie privée du Canada ou, au Québec, à la Commission d’accès à l’information.',
      ],
    },
    {
      heading: 'Témoins (cookies)',
      paragraphs: ['Choirbook n’utilise que les témoins nécessaires à son fonctionnement : un pour garder votre session ouverte, et deux pour retenir votre langue et votre apparence claire ou sombre. Il n’y a aucun témoin publicitaire ni de suivi.'],
    },
    {
      heading: 'Sécurité',
      paragraphs: [
        'Les renseignements circulent de façon chiffrée. Les données de chaque chœur sont séparées par des règles dans la base de données elle-même, l’accès du personnel est limité selon le rôle, les consultations et modifications des dossiers de membres sont journalisées, les fichiers sont servis par des liens privés de courte durée, et les tentatives de connexion sont limitées. Si un incident présente un risque réel de préjudice, nous en informerons les personnes concernées et les autorités de protection de la vie privée, comme l’exige la loi.',
      ],
    },
    {
      heading: 'Modifications',
      paragraphs: ['Si cette politique change de façon importante, nous en informerons les membres dans l’application avant que le changement prenne effet.'],
    },
  ],
};

const termsEn: LegalDoc = {
  title: 'Terms of use',
  intro: 'These terms apply to everyone who uses Choirbook: choristers, choir staff, and parents or guardians who sign forms. By signing in, you agree to them.',
  sections: [
    { heading: 'The pilot', paragraphs: ['Choirbook is in a free pilot with a small number of choirs. Features may change, and there may be interruptions. We will tell choirs ahead of any change that affects them.'] },
    {
      heading: 'Your account',
      list: [
        'Accounts are by invitation from your choir. You must be 14 or older.',
        'Keep your password to yourself, and tell your choir office if you think someone else has used your account.',
        'You can delete your account at any time from your account settings.',
      ],
    },
    {
      heading: 'Using Choirbook respectfully',
      list: [
        'Follow your choir’s code of conduct, including in messages.',
        'Do not post anything offensive, harassing or unlawful. Messages with offensive words may be held for staff to review, and staff can pause a member’s messaging.',
        'Do not try to see information that is not yours, or to disrupt the site.',
      ],
    },
    {
      heading: 'Music and files',
      paragraphs: [
        'Scores and recordings are uploaded by your choir for its members’ rehearsal use only. The choir is responsible for having the right to share them. Do not copy or share them outside the choir.',
      ],
    },
    {
      heading: 'Fees and payments',
      paragraphs: [
        'Fees are set and collected by your choir. Card payments are processed by Stripe. Questions about a fee, a refund or financial aid go to your choir office.',
      ],
    },
    { heading: 'The public demo', paragraphs: ['The demo at /demo uses a fictional choir. Anything you change there is reset every night, and no real email is sent from it.'] },
    {
      heading: 'Responsibility',
      paragraphs: [
        'We work to keep Choirbook accurate, secure and available, but it is provided as it is, without guarantees. Your choir remains responsible for its decisions, records and communications.',
      ],
    },
    { heading: 'Changes and contact', paragraphs: [`We will tell members in the app before these terms change in a way that matters. Questions: ${PRIVACY_CONTACT}, through the Send feedback button or your choir office. These terms are governed by the laws of Ontario and of Canada.`] },
  ],
};

const termsFr: LegalDoc = {
  title: 'Conditions d’utilisation',
  intro: 'Ces conditions s’appliquent à toutes les personnes qui utilisent Choirbook : choristes, personnel des chœurs, et parents ou tuteurs qui signent des formulaires. En vous connectant, vous les acceptez.',
  sections: [
    { heading: 'Le projet pilote', paragraphs: ['Choirbook fait l’objet d’un projet pilote gratuit avec un petit nombre de chœurs. Les fonctions peuvent changer et il peut y avoir des interruptions. Nous aviserons les chœurs avant tout changement qui les touche.'] },
    {
      heading: 'Votre compte',
      list: [
        'Les comptes sont créés sur invitation de votre chœur. Vous devez avoir 14 ans ou plus.',
        'Gardez votre mot de passe pour vous, et avisez le bureau de votre chœur si vous croyez que quelqu’un d’autre a utilisé votre compte.',
        'Vous pouvez supprimer votre compte en tout temps à partir des paramètres de votre compte.',
      ],
    },
    {
      heading: 'Utiliser Choirbook avec respect',
      list: [
        'Respectez le code de conduite de votre chœur, y compris dans les messages.',
        'Ne publiez rien d’offensant, de harcelant ou d’illégal. Les messages contenant des mots offensants peuvent être retenus pour examen par le personnel, qui peut suspendre la messagerie d’un membre.',
        'N’essayez pas de voir des renseignements qui ne sont pas les vôtres, ni de perturber le site.',
      ],
    },
    {
      heading: 'Musique et fichiers',
      paragraphs: [
        'Les partitions et enregistrements sont téléversés par votre chœur pour les répétitions de ses membres seulement. Le chœur est responsable d’avoir le droit de les partager. Ne les copiez pas et ne les partagez pas à l’extérieur du chœur.',
      ],
    },
    { heading: 'Frais et paiements', paragraphs: ['Les frais sont fixés et perçus par votre chœur. Les paiements par carte sont traités par Stripe. Les questions sur des frais, un remboursement ou une aide financière s’adressent au bureau de votre chœur.'] },
    { heading: 'La démo publique', paragraphs: ['La démo à /demo utilise un chœur fictif. Tout ce que vous y modifiez est réinitialisé chaque nuit, et aucun vrai courriel n’en est envoyé.'] },
    {
      heading: 'Responsabilité',
      paragraphs: ['Nous travaillons à ce que Choirbook soit exact, sécuritaire et disponible, mais il est fourni tel quel, sans garantie. Votre chœur demeure responsable de ses décisions, de ses dossiers et de ses communications.'],
    },
    { heading: 'Modifications et contact', paragraphs: [`Nous aviserons les membres dans l’application avant que ces conditions changent de façon importante. Questions : ${PRIVACY_CONTACT}, par le bouton Envoyer un commentaire ou par le bureau de votre chœur. Ces conditions sont régies par les lois de l’Ontario et du Canada.`] },
  ],
};

export function legalDoc(kind: 'privacy' | 'terms', lang: Lang): LegalDoc {
  if (kind === 'privacy') return lang === 'fr' ? privacyFr : privacyEn;
  return lang === 'fr' ? termsFr : termsEn;
}
