import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { playSoundEffect } from '../utils/sound';

type Language = 'en' | 'fr';

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    soundEnabled: boolean;
    setSoundEnabled: (enabled: boolean) => void;
    streamerMode: boolean;
    setStreamerMode: (enabled: boolean) => void;
    t: (key: string) => string;
    playSound: (type: 'click' | 'win' | 'lose' | 'error' | 'cashout' | 'tick') => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const TRANSLATIONS: Record<Language, Record<string, string>> = {
    en: {
        'nav.games': 'Originals',
        'nav.profile': 'Profile',
        'nav.fairness': 'Provably Fair',
        'nav.contest': 'Contest',
        'nav.settings': 'Settings',
        
        'wallet.deposit': 'Deposit',
        'wallet.withdraw': 'Withdraw',
        'wallet.buy_crypto': 'Buy Crypto',
        'wallet.test_faucet': 'Use Test Faucet',
        'wallet.simulate_withdrawal': 'Simulate Withdrawal',
        'wallet.locked': 'Wallet Locked',
        'wallet.locked_desc': 'You are currently in Tournament Mode. Deposits and withdrawals are disabled to ensure fair play.',
        'wallet.close': 'Close',

        'settings.title': 'Settings',
        'settings.language': 'Language',
        'settings.sound': 'Sound Effects',
        'settings.streamer': 'Streamer Mode',
        'settings.streamer_desc': 'Hides sensitive information like balance',

        'auth.login': 'Login',
        'auth.register': 'Register',
        'auth.welcome_back': 'Welcome Back',
        'auth.create_account': 'Create Account',
        'auth.login_desc': 'Login to continue your streak',
        'auth.register_desc': 'Join the premier crypto casino',
        'auth.username': 'Username',
        'auth.password': 'Password',
        'auth.no_account': "Don't have an account?",
        'auth.have_account': "Already have an account?",
        'auth.invalid_credentials': 'Invalid credentials',
        'auth.username_taken': 'Username already taken',
        
        'game.bet_amount': 'Bet Amount',
        'game.auto_cashout': 'Auto Cashout',
        'game.manual': 'Manual',
        'game.auto': 'Auto',
        'game.bet': 'Bet',
        'game.cashout': 'Cashout',
        'game.cancel': 'Cancel',
        'game.profit': 'Profit',
        'game.win_chance': 'Win Chance',
        'game.multiplier': 'Multiplier',
        'game.payout': 'Payout',
        'game.target': 'Target',
        'game.rows': 'Rows',
        'game.risk': 'Risk',
        'game.low': 'Low',
        'game.medium': 'Medium',
        'game.high': 'High',
        'game.classic': 'Classic',
        'game.pick_numbers': 'Pick up to 10 numbers',
        'game.mines_amount': 'Mines Amount',
        'game.autobet_active': 'AUTOBET ACTIVE',
        'game.total_bet': 'Total Bet',
        'game.chip_value': 'Chip Value',
        'game.spin': 'Spin',
        'game.spinning': 'Spinning...', 
        'game.deal': 'Deal',
        'game.hit': 'Hit',
        'game.stand': 'Stand',
        'game.double': 'Double',
        'game.dealer': 'Dealer',
        'game.you_win': 'YOU WIN!',
        'game.dealer_wins': 'DEALER WINS',
        'game.push': 'PUSH',
        'game.bust': 'BUST!',
        'game.blackjack': 'BLACKJACK!',
        'game.higher': 'HIGHER',
        'game.lower': 'LOWER',
        'game.same': 'SAME',
        'game.current_win': 'Current Win',
        'game.good_luck': 'Good Luck!',
        'game.lucky_spinner': 'Lucky Spinner',
        
        'profile.joined': 'Joined',
        'profile.vip_level': 'VIP Level',
        'profile.total_wagered': 'Total Wagered',
        'profile.total_bets': 'Total Bets',
        'profile.balance': 'Balance',
        'profile.wins': 'Wins',
        'profile.appearance': 'Appearance',
        'profile.logout': 'Logout',
        'profile.max_level': 'Max Level',

        'contest.title': 'Weekly Challenge',
        'contest.desc': 'Every week, players start with $100 tournament chips. The player with the highest balance at the end of the week wins real prizes!',
        'contest.prize_pool': 'Prize Pool',
        'contest.status': 'Your Status',
        'contest.active': 'Active Participant',
        'contest.spectating': 'Spectating',
        'contest.enter': 'Enter Tournament',
        'contest.exit': 'Exit Tournament',
        'contest.leaderboard': 'Leaderboard',

        'fairness.title': 'Provably Fair',
        'fairness.desc': 'Our system uses a transparent verification method. You can verify every roll using the Server Seed Hash, Client Seed, and Nonce.',
        'fairness.server_seed_hash': 'Server Seed Hash (Public)',
        'fairness.client_seed': 'Client Seed',
        'fairness.nonce': 'Nonce',
        'fairness.update_seed': 'Update Client Seed (Reset Nonce)',
        'fairness.rotate_seed': 'Rotate & Reveal Server Seed',
        'fairness.rotate_desc': '"Rotate" generates a new server secret and reveals the old one for verification.',
        'fairness.current_pair': 'Current Pair',
        'fairness.history': 'History (Verify)',
        'fairness.history_desc': 'Previous seeds are revealed here. You can hash the "Revealed Server Seed" with SHA256 to verify it matches the Hash you were shown during the game.',
        'fairness.revealed_seed': 'Revealed Server Seed',
        'fairness.your_client_seed': 'Your Client Seed',
        'fairness.hash_match': 'Hash (Verify Match)',
        'fairness.no_history': 'No history available yet.',
    },
    fr: {
        'nav.games': 'Originaux',
        'nav.profile': 'Profil',
        'nav.fairness': 'Équité',
        'nav.contest': 'Concours',
        'nav.settings': 'Paramètres',
        
        'wallet.deposit': 'Dépôt',
        'wallet.withdraw': 'Retrait',
        'wallet.buy_crypto': 'Acheter Crypto',
        'wallet.test_faucet': 'Utiliser Test Faucet',
        'wallet.simulate_withdrawal': 'Simuler Retrait',
        'wallet.locked': 'Portefeuille Verrouillé',
        'wallet.locked_desc': 'Vous êtes en mode tournoi. Les dépôts et retraits sont désactivés pour assurer l\'équité.',
        'wallet.close': 'Fermer',

        'settings.title': 'Paramètres',
        'settings.language': 'Langue',
        'settings.sound': 'Effets Sonores',
        'settings.streamer': 'Mode Streamer',
        'settings.streamer_desc': 'Masque les infos sensibles comme le solde',

        'auth.login': 'Connexion',
        'auth.register': 'S\'inscrire',
        'auth.welcome_back': 'Bon retour',
        'auth.create_account': 'Créer un compte',
        'auth.login_desc': 'Connectez-vous pour continuer',
        'auth.register_desc': 'Rejoignez le meilleur casino crypto',
        'auth.username': 'Nom d\'utilisateur',
        'auth.password': 'Mot de passe',
        'auth.no_account': "Pas de compte ?",
        'auth.have_account': "Déjà un compte ?",
        'auth.invalid_credentials': 'Identifiants invalides',
        'auth.username_taken': 'Nom d\'utilisateur pris',
        
        'game.bet_amount': 'Montant du Pari',
        'game.auto_cashout': 'Encaissement Auto',
        'game.manual': 'Manuel',
        'game.auto': 'Auto',
        'game.bet': 'Parier',
        'game.cashout': 'Encaisser',
        'game.cancel': 'Annuler',
        'game.profit': 'Profit',
        'game.win_chance': 'Chance de Gain',
        'game.multiplier': 'Multiplicateur',
        'game.payout': 'Gain',
        'game.target': 'Cible',
        'game.rows': 'Rangées',
        'game.risk': 'Risque',
        'game.low': 'Faible',
        'game.medium': 'Moyen',
        'game.high': 'Élevé',
        'game.classic': 'Classique',
        'game.pick_numbers': 'Choisissez jusqu\'à 10 numéros',
        'game.mines_amount': 'Nombre de Mines',
        'game.autobet_active': 'AUTOBET ACTIF',
        'game.total_bet': 'Pari Total',
        'game.chip_value': 'Valeur du Jeton',
        'game.spin': 'Tourner',
        'game.spinning': 'Tourne...', 
        'game.deal': 'Distribuer',
        'game.hit': 'Tirer',
        'game.stand': 'Rester',
        'game.double': 'Doubler',
        'game.dealer': 'Croupier',
        'game.you_win': 'VOUS GAGNEZ !',
        'game.dealer_wins': 'LE CROUPIER GAGNE',
        'game.push': 'ÉGALITÉ',
        'game.bust': 'SAUTÉ !',
        'game.blackjack': 'BLACKJACK !',
        'game.higher': 'PLUS HAUT',
        'game.lower': 'PLUS BAS',
        'game.same': 'IDENTIQUE',
        'game.current_win': 'Gain Actuel',
        'game.good_luck': 'Bonne Chance !',
        'game.lucky_spinner': 'Roue de la Chance',
        
        'profile.joined': 'Rejoint',
        'profile.vip_level': 'Niveau VIP',
        'profile.total_wagered': 'Total Parié',
        'profile.total_bets': 'Total Paris',
        'profile.balance': 'Solde',
        'profile.wins': 'Victoires',
        'profile.appearance': 'Apparence',
        'profile.logout': 'Déconnexion',
        'profile.max_level': 'Niveau Max',

        'contest.title': 'Défi Hebdo',
        'contest.desc': 'Chaque semaine, départ avec 100$ de jetons tournoi. Le joueur avec le plus gros solde gagne !',
        'contest.prize_pool': 'Cagnotte',
        'contest.status': 'Votre Statut',
        'contest.active': 'Participant Actif',
        'contest.spectating': 'Spectateur',
        'contest.enter': 'Rejoindre le Tournoi',
        'contest.exit': 'Quitter le Tournoi',
        'contest.leaderboard': 'Classement',

        'fairness.title': 'Prouvé Équitable',
        'fairness.desc': 'Notre système utilise une méthode de vérification transparente. Vous pouvez vérifier chaque tirage.',
        'fairness.server_seed_hash': 'Graine Serveur (Public)',
        'fairness.client_seed': 'Graine Client',
        'fairness.nonce': 'Nonce',
        'fairness.update_seed': 'Mettre à jour Graine (Reset Nonce)',
        'fairness.rotate_seed': 'Tourner & Révéler Graine Serveur',
        'fairness.rotate_desc': '"Tourner" génère un nouveau secret et révèle l\'ancien pour vérification.',
        'fairness.current_pair': 'Paire Actuelle',
        'fairness.history': 'Historique',
        'fairness.history_desc': 'Les graines précédentes sont révélées ici pour vérification SHA256.',
        'fairness.revealed_seed': 'Graine Serveur Révélée',
        'fairness.your_client_seed': 'Votre Graine Client',
        'fairness.hash_match': 'Hash (Vérification)',
        'fairness.no_history': 'Aucun historique disponible.',
    }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [language, setLanguage] = useState<Language>('en');
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [streamerMode, setStreamerMode] = useState(false);

    // Persist settings
    useEffect(() => {
        const savedLang = localStorage.getItem('vewire_lang') as Language;
        if (savedLang) setLanguage(savedLang);
        
        const savedSound = localStorage.getItem('vewire_sound');
        if (savedSound) setSoundEnabled(savedSound === 'true');

        const savedStreamer = localStorage.getItem('vewire_streamer');
        if (savedStreamer) setStreamerMode(savedStreamer === 'true');
    }, []);

    useEffect(() => {
        localStorage.setItem('vewire_lang', language);
        localStorage.setItem('vewire_sound', String(soundEnabled));
        localStorage.setItem('vewire_streamer', String(streamerMode));
    }, [language, soundEnabled, streamerMode]);

    const t = (key: string) => {
        return TRANSLATIONS[language][key] || key;
    };

    const playSound = (type: 'click' | 'win' | 'lose' | 'error' | 'cashout' | 'tick') => {
        if (soundEnabled) {
            playSoundEffect(type);
        }
    };

    return (
        <SettingsContext.Provider value={{ 
            language, setLanguage, 
            soundEnabled, setSoundEnabled, 
            streamerMode, setStreamerMode,
            t, playSound
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};