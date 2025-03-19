// Elementi DOM
const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboard = document.getElementById('adminDashboard');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminUsername = document.getElementById('adminUsername');
const adminPassword = document.getElementById('adminPassword');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const filterForm = document.getElementById('filterForm');
const filterOperaio = document.getElementById('filterOperaio');
const filterCantiere = document.getElementById('filterCantiere');
const filterDataInizio = document.getElementById('filterDataInizio');
const filterDataFine = document.getElementById('filterDataFine');
const refreshDataBtn = document.getElementById('refreshDataBtn');
const exportDataBtn = document.getElementById('exportDataBtn');
const registrazioniTableBody = document.getElementById('registrazioniTableBody');
const totalOre = document.getElementById('totalOre');
const totalStraordinario = document.getElementById('totalStraordinario');

// Configurazione
const adminCredentials = {
    username: 'admin',
    password: 'edilcoperture2025'
};

// Dati
let registrazioni = [];
let operai = [];
let cantieri = [];
let isAdmin = false;

// Funzioni
document.addEventListener('DOMContentLoaded', function() {
    // Imposta date predefinite per il filtro (ultimi 30 giorni)
    const oggi = new Date();
    const treintaGiorniFa = new Date();
    treintaGiorniFa.setDate(oggi.getDate() - 30);
    
    filterDataFine.valueAsDate = oggi;
    filterDataInizio.valueAsDate = treintaGiorniFa;
    
    // Gestisci login
    adminLoginForm.addEventListener('submit', handleAdminLogin);
    
    // Gestisci logout
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
    
    // Gestisci filtri
    filterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        applicaFiltri();
    });
    
    filterForm.addEventListener('reset', function() {
        setTimeout(() => {
            applicaFiltri();
        }, 10);
    });
    
    // Gestisci aggiornamento dati
    refreshDataBtn.addEventListener('click', caricaDati);
    
    // Gestisci esportazione dati
    exportDataBtn.addEventListener('click', esportaExcel);
    
    // Controlla se l'utente è già loggato
    checkAdminLogin();
});

// Gestisce il login admin
function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = adminUsername.value;
    const password = adminPassword.value;
    
    if (username === adminCredentials.username && password === adminCredentials.password) {
        isAdmin = true;
        sessionStorage.setItem('adminLoggedIn', 'true');
        
        // Mostra dashboard
        adminLoginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        
        // Carica dati
        caricaDati();
    } else {
        alert('Credenziali non valide');
    }
}

// Controlla se l'admin è già loggato
function checkAdminLogin() {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        isAdmin = true;
        adminLoginSection.style.display = 'none';
        adminDashboard.style.display = 'block';
        caricaDati();
    }
}

// Gestisce il logout admin
function handleAdminLogout() {
    isAdmin = false;
    sessionStorage.removeItem('adminLoggedIn');
    
    // Torna alla pagina di login
    adminDashboard.style.display = 'none';
    adminLoginSection.style.display = 'block';
    adminLoginForm.reset();
}

// Carica dati da Firebase
function caricaDati() {
    if (!isAdmin) return;
    
    // Mostra loader
    registrazioniTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2">Caricamento dati in corso...</p>
            </td>
        </tr>
    `;
    
    // Carica operai
    const operaiPromise = fetchOperai();
    
    // Carica cantieri
    const cantieriPromise = fetchCantieri();
    
    // Carica registrazioni
    const registrazioniPromise = fetchRegistrazioni();
    
    // Attendi che tutti i dati siano caricati
    Promise.all([operaiPromise, cantieriPromise, registrazioniPromise])
        .then(() => {
            applicaFiltri();
        })
        .catch(error => {
            console.error('Errore nel caricamento dei dati:', error);
            registrazioniTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-danger">
                        <i class="fas fa-exclamation-circle fa-2x mb-3"></i>
                        <p>Si è verificato un errore nel caricamento dei dati.</p>
                        <button class="btn btn-sm btn-outline-primary" onclick="caricaDati()">
                            <i class="fas fa-sync-alt me-1"></i> Riprova
                        </button>
                    </td>
                </tr>
            `;
        });
}

// Funzione per recuperare gli operai dal server
async function fetchOperai() {
    try {
        // Determina se siamo in locale o in produzione
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const serverUrl = isLocal ? 'http://localhost:3000' : 'https://tuodominio.com'; // Cambia con il tuo dominio se ne hai uno
        
        let response;
        
        if (isLocal) {
            // In locale, usa l'API del server
            response = await fetch(`${serverUrl}/api/esporta-operai`);
        } else {
            // In produzione, usa il file JSON statico
            response = await fetch('data/operai.json');
        }
        
        const data = await response.json();
        
        if (data.success) {
            operai = data.operai;
            
            // Popola il select degli operai
            filterOperaio.innerHTML = '<option value="">Tutti</option>';
            operai.forEach(operaio => {
                const option = document.createElement('option');
                option.value = operaio.id;
                option.textContent = operaio.nome;
                filterOperaio.appendChild(option);
            });
            
            return true;
        } else {
            throw new Error('Errore nel recupero degli operai');
        }
    } catch (error) {
        console.error('Errore nel caricamento degli operai:', error);
        // Usa operai di fallback in caso di errore
        operai = [
            { id: 1, nome: "Mario Rossi" },
            { id: 2, nome: "Giuseppe Verdi" },
            { id: 3, nome: "Antonio Bianchi" }
        ];
        
        // Popola il select con i dati di fallback
        filterOperaio.innerHTML = '<option value="">Tutti</option>';
        operai.forEach(operaio => {
            const option = document.createElement('option');
            option.value = operaio.id;
            option.textContent = operaio.nome;
            filterOperaio.appendChild(option);
        });
        
        return false;
    }
}

// Funzione per recuperare i cantieri dal server
async function fetchCantieri() {
    try {
        // Determina se siamo in locale o in produzione
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const serverUrl = isLocal ? 'http://localhost:3000' : 'https://tuodominio.com'; // Cambia con il tuo dominio se ne hai uno
        
        let response;
        
        if (isLocal) {
            // In locale, usa l'API del server
            response = await fetch(`${serverUrl}/api/esporta-cantieri`);
        } else {
            // In produzione, usa il file JSON statico
            response = await fetch('data/cantieri.json');
        }
        
        const data = await response.json();
        
        if (data.success) {
            cantieri = data.cantieri;
            
            // Popola il select dei cantieri
            filterCantiere.innerHTML = '<option value="">Tutti</option>';
            cantieri.forEach(cantiere => {
                const option = document.createElement('option');
                option.value = cantiere.id;
                option.textContent = cantiere.nome;
                filterCantiere.appendChild(option);
            });
            
            return true;
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
        filterCantiere.innerHTML = '<option value="">Tutti</option>';
        cantieri.forEach(cantiere => {
            const option = document.createElement('option');
            option.value = cantiere.id;
            option.textContent = cantiere.nome;
            filterCantiere.appendChild(option);
        });
        
        return false;
    }
}

// Funzione per recuperare le registrazioni da Firebase
async function fetchRegistrazioni() {
    try {
        const snapshot = await db.collection('registrazioniOre')
            .orderBy('data', 'desc')
            .get();
            
        registrazioni = [];
        snapshot.forEach(doc => {
            registrazioni.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return true;
    } catch (error) {
        console.error('Errore nel caricamento delle registrazioni:', error);
        registrazioni = [];
        return false;
    }
}

// Applica filtri alle registrazioni
function applicaFiltri() {
    if (!isAdmin) return;
    
    const operaioId = filterOperaio.value ? parseInt(filterOperaio.value) : null;
    const cantiereId = filterCantiere.value ? parseInt(filterCantiere.value) : null;
    const dataInizio = filterDataInizio.value ? new Date(filterDataInizio.value) : null;
    const dataFine = filterDataFine.value ? new Date(filterDataFine.value) : null;
    
    // Filtra registrazioni
    let registrazioniFiltrate = [...registrazioni];
    
    if (operaioId) {
        registrazioniFiltrate = registrazioniFiltrate.filter(r => r.operaioId === operaioId);
    }
    
    if (cantiereId) {
        registrazioniFiltrate = registrazioniFiltrate.filter(r => r.cantiereId === cantiereId);
    }
    
    if (dataInizio) {
        registrazioniFiltrate = registrazioniFiltrate.filter(r => new Date(r.data) >= dataInizio);
    }
    
    if (dataFine) {
        // Imposta l'ora a 23:59:59 per includere l'intero giorno
        const fineGiorno = new Date(dataFine);
        fineGiorno.setHours(23, 59, 59, 999);
        registrazioniFiltrate = registrazioniFiltrate.filter(r => new Date(r.data) <= fineGiorno);
    }
    
    // Calcola totali
    let totOre = 0;
    let totStraordinario = 0;
    
    registrazioniFiltrate.forEach(r => {
        totOre += r.ore || 0;
        totStraordinario += r.straordinario || 0;
    });
    
    // Aggiorna totali
    totalOre.textContent = totOre.toFixed(1);
    totalStraordinario.textContent = totStraordinario.toFixed(1);
    
    // Aggiorna tabella
    aggiornaTabella(registrazioniFiltrate);
}

// Aggiorna la tabella con i dati filtrati
function aggiornaTabella(dati) {
    registrazioniTableBody.innerHTML = '';
    
    if (dati.length === 0) {
        registrazioniTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p class="text-muted mb-0">Nessun dato trovato con i filtri selezionati</p>
                </td>
            </tr>
        `;
        return;
    }
    
    dati.forEach(reg => {
        const tr = document.createElement('tr');
        
        // Formatta data
        const dataParts = reg.data.split('-');
        const dataFormattata = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
        
        tr.innerHTML = `
            <td>${dataFormattata}</td>
            <td>${reg.operaioNome}</td>
            <td>${reg.cantiereName}</td>
            <td>${reg.ore}</td>
            <td>${reg.straordinario || 0}</td>
            <td>${reg.note || ''}</td>
        `;
        
        registrazioniTableBody.appendChild(tr);
    });
}

// Esporta dati in Excel
function esportaExcel() {
    if (!isAdmin || registrazioni.length === 0) {
        alert('Nessun dato da esportare');
        return;
    }
    
    // Applica filtri attuali
    const operaioId = filterOperaio.value ? parseInt(filterOperaio.value) : null;
    const cantiereId = filterCantiere.value ? parseInt(filterCantiere.value) : null;
    const dataInizio = filterDataInizio.value ? new Date(filterDataInizio.value) : null;
    const dataFine = filterDataFine.value ? new Date(filterDataFine.value) : null;
    
    // Filtra registrazioni
    let datiDaEsportare = [...registrazioni];
    
    if (operaioId) {
        datiDaEsportare = datiDaEsportare.filter(r => r.operaioId === operaioId);
    }
    
    if (cantiereId) {
        datiDaEsportare = datiDaEsportare.filter(r => r.cantiereId === cantiereId);
    }
    
    if (dataInizio) {
        datiDaEsportare = datiDaEsportare.filter(r => new Date(r.data) >= dataInizio);
    }
    
    if (dataFine) {
        const fineGiorno = new Date(dataFine);
        fineGiorno.setHours(23, 59, 59, 999);
        datiDaEsportare = datiDaEsportare.filter(r => new Date(r.data) <= fineGiorno);
    }
    
    // Prepara dati per Excel
    const datiFormattati = datiDaEsportare.map(reg => {
        // Formatta data
        const dataParts = reg.data.split('-');
        const dataFormattata = `${dataParts[2]}/${dataParts[1]}/${dataParts[0]}`;
        
        return {
            'Data': dataFormattata,
            'Operaio': reg.operaioNome,
            'Cantiere': reg.cantiereName,
            'Ore': reg.ore,
            'Straordinario': reg.straordinario || 0,
            'Note': reg.note || ''
        };
    });
    
    // Crea workbook Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(datiFormattati);
    
    // Aggiungi foglio al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro Ore');
    
    // Genera nome file con data
    const oggi = new Date();
    const nomeFile = `Registro_Ore_EDILCOPERTURE_${oggi.getDate()}-${oggi.getMonth()+1}-${oggi.getFullYear()}.xlsx`;
    
    // Esporta file
    XLSX.writeFile(workbook, nomeFile);
}