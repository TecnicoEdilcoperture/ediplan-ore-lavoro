// Elementi DOM
const loginSection = document.getElementById('loginSection');
const appSection = document.getElementById('appSection');
const loginForm = document.getElementById('loginForm');
const operaioSelect = document.getElementById('operaioSelect');
const pinCode = document.getElementById('pinCode');
const userButton = document.getElementById('userButton');
const userName = document.getElementById('userName');
const registraOreForm = document.getElementById('registraOreForm');
const dataLavoro = document.getElementById('dataLavoro');
const cantiereSelect = document.getElementById('cantiereSelect');
const oreLavorate = document.getElementById('oreLavorate');
const straordinario = document.getElementById('straordinario');
const note = document.getElementById('note');
const riepilogoBody = document.getElementById('riepilogoBody');
const totaleOre = document.getElementById('totaleOre');
const totaleStraordinario = document.getElementById('totaleStraordinario');
const logoutButton = document.getElementById('logoutButton');
const refreshButton = document.getElementById('refreshButton');
const offlineBanner = document.getElementById('offlineBanner');

// Configurazione dati
const operai = [
    { id: 1, nome: "Mario Rossi", pin: "1234" },
    { id: 2, nome: "Giuseppe Verdi", pin: "5678" },
    { id: 3, nome: "Antonio Bianchi", pin: "9012" }
];

const cantieri = [
    { id: 1, nome: "Cantiere Via Roma 123" },
    { id: 2, nome: "Ristrutturazione Condominio Sole" },
    { id: 3, nome: "Edificio Nuovo Polo" },
    { id: 4, nome: "Villa Serena" }
];

// Utente corrente
let currentUser = null;

// Stato connessione
let isOnline = navigator.onLine;

// Alla carica della pagina
document.addEventListener('DOMContentLoaded', function() {
    // Imposta la data di oggi
    const oggi = new Date();
    dataLavoro.valueAsDate = oggi;
    
    // Popola il select degli operai
    operai.forEach(operaio => {
        const option = document.createElement('option');
        option.value = operaio.id;
        option.textContent = operaio.nome;
        operaioSelect.appendChild(option);
    });
    
    // Popola il select dei cantieri
    cantieri.forEach(cantiere => {
        const option = document.createElement('option');
        option.value = cantiere.id;
        option.textContent = cantiere.nome;
        cantiereSelect.appendChild(option);
    });
    
    // Gestisci login
    loginForm.addEventListener('submit', handleLogin);
    
    // Gestisci registrazione ore
    registraOreForm.addEventListener('submit', handleRegistraOre);
    
    // Gestisci logout
    logoutButton.addEventListener('click', handleLogout);
    
    // Gestisci aggiornamento riepilogo
    refreshButton.addEventListener('click', caricaRiepilogo);
    
    // Controlla lo stato online/offline
    checkOnlineStatus();
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
    
    // Controlla se l'utente è già loggato
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
        const user = operai.find(op => op.id == savedUserId);
        if (user) {
            doLogin(user);
        }
    }
});

// Gestisce il login
function handleLogin(e) {
    e.preventDefault();
    
    const userId = operaioSelect.value;
    const pin = pinCode.value;
    
    if (!userId || !pin) {
        alert('Seleziona un operaio e inserisci il PIN');
        return;
    }
    
    const operaio = operai.find(op => op.id == userId);
    
    if (!operaio) {
        alert('Operaio non trovato');
        return;
    }
    
    if (operaio.pin !== pin) {
        alert('PIN non valido');
        return;
    }
    
    doLogin(operaio);
}

// Effettua il login
function doLogin(operaio) {
    currentUser = operaio;
    localStorage.setItem('currentUserId', operaio.id);
    
    // Aggiorna UI
    userName.textContent = operaio.nome;
    userButton.classList.remove('d-none');
    loginSection.classList.add('d-none');
    appSection.classList.remove('d-none');
    
    // Carica riepilogo
    caricaRiepilogo();
}

// Gestisce la registrazione delle ore
function handleRegistraOre(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Devi prima effettuare il login');
        return;
    }
    
    const nuovaRegistrazione = {
        operaioId: currentUser.id,
        operaioNome: currentUser.nome,
        data: dataLavoro.value,
        cantiereId: parseInt(cantiereSelect.value),
        cantiereName: cantieri.find(c => c.id == cantiereSelect.value)?.nome || '',
        ore: parseFloat(oreLavorate.value),
        straordinario: parseFloat(straordinario.value) || 0,
        note: note.value,
        timestamp: new Date().toISOString()
    };
    
    // Salva localmente
    let registrazioni = JSON.parse(localStorage.getItem('registrazioniOre') || '[]');
    registrazioni.push(nuovaRegistrazione);
    localStorage.setItem('registrazioniOre', JSON.stringify(registrazioni));
    
    // Aggiorna riepilogo
    caricaRiepilogo();
    
    // Invia al server se online
    if (isOnline) {
        sincronizzaDati();
    }
    
    // Resetta form
    registraOreForm.reset();
    dataLavoro.valueAsDate = new Date();
    
    alert('Ore registrate con successo!');
}

// Carica riepilogo settimanale
function caricaRiepilogo() {
    if (!currentUser) return;
    
    let registrazioni = JSON.parse(localStorage.getItem('registrazioniOre') || '[]');
    
    // Filtra per operaio corrente
    registrazioni = registrazioni.filter(r => r.operaioId == currentUser.id);
    
    // Ordina per data (più recenti prima)
    registrazioni.sort((a, b) => new Date(b.data) - new Date(a.data));
    
    // Limita alle ultime 7 registrazioni
    registrazioni = registrazioni.slice(0, 7);
    
    // Aggiorna tabella
    riepilogoBody.innerHTML = '';
    
    let totOre = 0;
    let totStraordinario = 0;
    
    if (registrazioni.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = '<td colspan="4" class="text-center">Nessuna registrazione recente</td>';
        riepilogoBody.appendChild(tr);
    } else {
        registrazioni.forEach(reg => {
            const tr = document.createElement('tr');
            
            // Formatta data
            const dataParts = reg.data.split('-');
            const dataFormattata = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
            
            tr.innerHTML = `
                <td>${dataFormattata}</td>
                <td>${reg.cantiereName}</td>
                <td>${reg.ore}</td>
                <td>${reg.straordinario}</td>
            `;
            
            riepilogoBody.appendChild(tr);
            
            totOre += reg.ore;
            totStraordinario += reg.straordinario;
        });
    }
    
    // Aggiorna totali
    totaleOre.textContent = totOre.toFixed(1);
    totaleStraordinario.textContent = totStraordinario.toFixed(1);
}

// Gestisce il logout
function handleLogout() {
    currentUser = null;
    localStorage.removeItem('currentUserId');
    
    // Aggiorna UI
    userButton.classList.add('d-none');
    appSection.classList.add('d-none');
    loginSection.classList.remove('d-none');
    
    // Resetta form
    loginForm.reset();
    registraOreForm.reset();
    dataLavoro.valueAsDate = new Date();
}

// Controlla stato connessione
function checkOnlineStatus() {
    isOnline = navigator.onLine;
    
    if (isOnline) {
        offlineBanner.classList.add('d-none');
        sincronizzaDati();
    } else {
        offlineBanner.classList.remove('d-none');
    }
}

// Sincronizza dati con Firebase
function sincronizzaDati() {
    if (!isOnline) return;
    
    // In una versione reale, qui ci sarebbe il codice per sincronizzare 
    // i dati con Firebase Firestore
    console.log('Sincronizzazione dati...');
    
    // Esempio di codice (commentato perché non è ancora configurato Firebase)
    /*
    let registrazioni = JSON.parse(localStorage.getItem('registrazioniOre') || '[]');
    
    registrazioni.forEach(reg => {
        // Se non è già stato sincronizzato
        if (!reg.sincronizzato) {
            db.collection('registrazioniOre').add(reg)
                .then(() => {
                    reg.sincronizzato = true;
                    localStorage.setItem('registrazioniOre', JSON.stringify(registrazioni));
                })
                .catch(error => {
                    console.error('Errore durante la sincronizzazione:', error);
                });
        }
    });
    */
}