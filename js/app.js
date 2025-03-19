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
let operai = [];
let cantieri = [];

// Utente corrente
let currentUser = null;

// Stato connessione
let isOnline = navigator.onLine;

// Alla carica della pagina
document.addEventListener('DOMContentLoaded', function() {
    // Carica dati iniziali
    Promise.all([
        fetchOperai(),
        fetchCantieri()
    ]).then(() => {
        // Imposta la data di oggi
        const oggi = new Date();
        dataLavoro.valueAsDate = oggi;
        
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
    }).catch(error => {
        console.error('Errore nel caricamento dei dati iniziali:', error);
        alert('Impossibile caricare i dati. Controlla la connessione e riprova.');
    });
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
    
    // Carica riepilogo locale
    caricaRiepilogo();
    
    // Se online, carica dati da Firebase
    if (isOnline) {
        caricaDatiDaFirebase();
    }
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
    
    console.log('Sincronizzazione dati con Firebase...');
    
    let registrazioni = JSON.parse(localStorage.getItem('registrazioniOre') || '[]');
    const registrazioniDaSincronizzare = registrazioni.filter(reg => !reg.sincronizzato);
    
    if (registrazioniDaSincronizzare.length === 0) {
        console.log('Nessun dato da sincronizzare');
        return;
    }
    
    // Mostra indicatore di sincronizzazione
    const syncIndicator = document.createElement('div');
    syncIndicator.className = 'position-fixed top-0 end-0 p-3';
    syncIndicator.innerHTML = `
        <div class="toast show" role="alert">
            <div class="toast-header">
                <strong class="me-auto">Sincronizzazione</strong>
            </div>
            <div class="toast-body">
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                    Sincronizzazione dati in corso...
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(syncIndicator);
    
    // Crea un array di promesse per la sincronizzazione
    const promises = registrazioniDaSincronizzare.map(reg => {
        return db.collection('registrazioniOre').add({
            operaioId: reg.operaioId,
            operaioNome: reg.operaioNome,
            data: reg.data,
            cantiereId: reg.cantiereId,
            cantiereName: reg.cantiereName,
            ore: reg.ore,
            straordinario: reg.straordinario,
            note: reg.note,
            timestamp: reg.timestamp,
            sincronizzatoIl: firebase.firestore.FieldValue.serverTimestamp()
        });
    });
    
    // Attendi che tutte le promesse siano risolte
    Promise.all(promises)
        .then(() => {
            console.log('Sincronizzazione completata con successo');
            
            // Aggiorna lo stato di sincronizzazione
            registrazioni.forEach(reg => {
                const index = registrazioniDaSincronizzare.findIndex(r => 
                    r.operaioId === reg.operaioId && 
                    r.data === reg.data && 
                    r.timestamp === reg.timestamp);
                
                if (index !== -1) {
                    reg.sincronizzato = true;
                }
            });
            
            localStorage.setItem('registrazioniOre', JSON.stringify(registrazioni));
            
            // Rimuovi l'indicatore di sincronizzazione dopo 2 secondi
            setTimeout(() => {
                document.body.removeChild(syncIndicator);
            }, 2000);
        })
        .catch(error => {
            console.error('Errore durante la sincronizzazione:', error);
            
            // Cambia indicatore in errore
            syncIndicator.innerHTML = `
                <div class="toast show bg-danger text-white" role="alert">
                    <div class="toast-header bg-danger text-white">
                        <strong class="me-auto">Errore</strong>
                    </div>
                    <div class="toast-body">
                        Errore durante la sincronizzazione. Riprova più tardi.
                    </div>
                </div>
            `;
            
            // Rimuovi l'indicatore dopo 3 secondi
            setTimeout(() => {
                document.body.removeChild(syncIndicator);
            }, 3000);
        });
}

// Carica dati da Firebase
function caricaDatiDaFirebase() {
    if (!isOnline || !currentUser) return;
    
    console.log('Caricamento dati da Firebase...');
    
    db.collection('registrazioniOre')
        .where('operaioId', '==', currentUser.id)
        .orderBy('data', 'desc')
        .limit(30)  // Ultimi 30 giorni
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('Nessun dato trovato su Firebase');
                return;
            }
            
            let registrazioni = JSON.parse(localStorage.getItem('registrazioniOre') || '[]');
            let nuoveRegistrazioni = false;
            
            snapshot.forEach(doc => {
                const datiServer = doc.data();
                
                // Controlla se questa registrazione è già presente in locale
                const esisteLocalmente = registrazioni.some(reg => 
                    reg.operaioId === datiServer.operaioId && 
                    reg.data === datiServer.data && 
                    reg.timestamp === datiServer.timestamp);
                
                if (!esisteLocalmente) {
                    // Aggiungi i dati dal server alle registrazioni locali
                    registrazioni.push({
                        ...datiServer,
                        sincronizzato: true
                    });
                    nuoveRegistrazioni = true;
                }
            });
            
            if (nuoveRegistrazioni) {
                localStorage.setItem('registrazioniOre', JSON.stringify(registrazioni));
                caricaRiepilogo();
                
                // Notifica all'utente
                const toast = document.createElement('div');
                toast.className = 'position-fixed bottom-0 end-0 p-3';
                toast.style.zIndex = 11;
                toast.innerHTML = `
                    <div class="toast show" role="alert">
                        <div class="toast-header">
                            <strong class="me-auto">Aggiornamento</strong>
                            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()"></button>
                        </div>
                        <div class="toast-body">
                            Nuove registrazioni caricate dal server.
                        </div>
                    </div>
                `;
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 5000);
            }
        })
        .catch(error => {
            console.error('Errore durante il caricamento dei dati da Firebase:', error);
        });
}

// Funzione per recuperare gli operai dal server
async function fetchOperai() {
    try {
        const response = await fetch('http://localhost:3000/api/esporta-operai');
        const data = await response.json();
        
        if (data.success) {
            operai = data.operai;
            
            // Popola il select degli operai
            operaioSelect.innerHTML = '<option value="">Seleziona...</option>';
            operai.forEach(operaio => {
                const option = document.createElement('option');
                option.value = operaio.id;
                option.textContent = operaio.nome;
                operaioSelect.appendChild(option);
            });
        } else {
            throw new Error('Errore nel recupero degli operai');
        }
    } catch (error) {
        console.error('Errore nel caricamento degli operai:', error);
        // Usa operai di fallback in caso di errore
        operai = [
            { id: 1, nome: "Mario Rossi", pin: "1234" },
            { id: 2, nome: "Giuseppe Verdi", pin: "5678" },
            { id: 3, nome: "Antonio Bianchi", pin: "9012" }
        ];
        
        // Popola il select con i dati di fallback
        operaioSelect.innerHTML = '<option value="">Seleziona...</option>';
        operai.forEach(operaio => {
            const option = document.createElement('option');
            option.value = operaio.id;
            option.textContent = operaio.nome;
            operaioSelect.appendChild(option);
        });
    }
}

// Funzione per recuperare i cantieri dal server
async function fetchCantieri() {
    try {
        const response = await fetch('http://localhost:3000/api/esporta-cantieri');
        const data = await response.json();
        
        if (data.success) {
            cantieri = data.cantieri;
            
            // Popola il select dei cantieri
            cantiereSelect.innerHTML = '<option value="">Seleziona cantiere...</option>';
            cantieri.forEach(cantiere => {
                const option = document.createElement('option');
                option.value = cantiere.id;
                option.textContent = cantiere.nome;
                cantiereSelect.appendChild(option);
            });
        } else {
            throw new Error('Errore nel recupero dei cantieri');
        }
    } catch (error) {
        console.error('Errore nel caricamento dei cantieri:', error);
        // Usa cantieri di fallback in caso di errore
        cantieri = [
            { id: 1, nome: "Cantiere Via Roma 123" },
            { id: 2, nome: "Ristrutturazione Condominio Sole" },
            { id: 3, nome: "Edificio Nuovo Polo" },
            { id: 4, nome: "Villa Serena" }
        ];
        
        // Popola il select con i dati di fallback
        cantiereSelect.innerHTML = '<option value="">Seleziona cantiere...</option>';
        cantieri.forEach(cantiere => {
            const option = document.createElement('option');
            option.value = cantiere.id;
            option.textContent = cantiere.nome;
            cantiereSelect.appendChild(option);
        });
    }
}

// Carica dati da Firebase
function caricaDatiDaFirebase() {
    if (!isOnline || !currentUser) return;
    
    console.log('Caricamento dati da Firebase...');
    
    db.collection('registrazioniOre')
        .where('operaioId', '==', currentUser.id)
        .orderBy('data', 'desc')
        .limit(30)  // Ultimi 30 giorni
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                console.log('Nessun dato trovato su Firebase');
                return;
            }
            
            let registrazioni = JSON.parse(localStorage.getItem('registrazioniOre') || '[]');
            let nuoveRegistrazioni = false;
            
            snapshot.forEach(doc => {
                const datiServer = doc.data();
                
                // Controlla se questa registrazione è già presente in locale
                const esisteLocalmente = registrazioni.some(reg => 
                    reg.operaioId === datiServer.operaioId && 
                    reg.data === datiServer.data && 
                    reg.timestamp === datiServer.timestamp);
                
                if (!esisteLocalmente) {
                    // Aggiungi i dati dal server alle registrazioni locali
                    registrazioni.push({
                        ...datiServer,
                        sincronizzato: true
                    });
                    nuoveRegistrazioni = true;
                }
            });
            
            if (nuoveRegistrazioni) {
                localStorage.setItem('registrazioniOre', JSON.stringify(registrazioni));
                caricaRiepilogo();
                
                // Notifica all'utente
                const toast = document.createElement('div');
                toast.className = 'position-fixed bottom-0 end-0 p-3';
                toast.style.zIndex = 11;
                toast.innerHTML = `
                    <div class="toast show" role="alert">
                        <div class="toast-header">
                            <strong class="me-auto">Aggiornamento</strong>
                            <button type="button" class="btn-close" onclick="this.parentElement.parentElement.parentElement.remove()"></button>
                        </div>
                        <div class="toast-body">
                            Nuove registrazioni caricate dal server.
                        </div>
                    </div>
                `;
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 5000);
            }
        })
        .catch(error => {
            console.error('Errore durante il caricamento dei dati da Firebase:', error);
        });
}