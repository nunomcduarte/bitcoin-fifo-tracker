let transactions = JSON.parse(localStorage.getItem('btcTransactions')) || { buys: [], sells: [] };
let currentUnit = 'BTC'; // Default unit is Bitcoin

function round(value, decimals = 2) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

// Convert between Bitcoin and Satoshis
function convertToSatoshis(amount) {
    return amount * 100_000_000;
}

function convertToBitcoin(amount) {
    return amount / 100_000_000;
}

// Handle unit change
function changeUnit() {
    currentUnit = document.getElementById('unit-selector').value;

    // Update the placeholder for the BTC Amount input field
    const amountInput = document.getElementById('amount');
    amountInput.placeholder = currentUnit === 'BTC' ? 'BTC Amount' : 'SATS Amount';

    updateUI();
}

function addTransaction() {
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    const inputAmount = parseFloat(document.getElementById('amount').value);
    const price = parseFloat(document.getElementById('price').value);
    const fees = parseFloat(document.getElementById('fees').value);

    if (!date || isNaN(inputAmount) || isNaN(price) || isNaN(fees)) {
        alert("❌ Please fill out all fields with valid data.");
        return;
    }

    // Convert the amount to Bitcoin if the unit is Satoshis
    const amount = currentUnit === 'BTC' ? inputAmount : convertToBitcoin(inputAmount);

    const transaction = { date, amount, price, fees };

    if (type === 'buy') {
        transaction.remaining = amount;
        transactions.buys.push(transaction);
    } else {
        const success = calculateFIFO(transaction);
        if (success) {
            transactions.sells.push(transaction);
        } else {
            alert("❌ Not enough BTC available to sell.");
            return;
        }
    }

    localStorage.setItem('btcTransactions', JSON.stringify(transactions));
    updateUI();
    resetForm();
}

function calculateFIFO(sell) {
    let remaining = sell.amount;
    let totalCostBasis = 0;
    const availableBTC = transactions.buys.reduce((sum, buy) => sum + buy.remaining, 0);

    if (remaining > availableBTC) {
        return false;
    }

    for (let buy of transactions.buys) {
        if (buy.remaining <= 0) continue;
        let used = Math.min(buy.remaining, remaining);
        totalCostBasis += round(used * buy.price, 2);
        buy.remaining -= used;
        remaining -= used;
        if (remaining <= 0) break;
    }

    sell.costBasis = totalCostBasis;
    sell.gainLoss = round((sell.amount * sell.price - sell.fees) - totalCostBasis, 2);
    return true;
}

function updateUI() {
    document.querySelectorAll('table tbody').forEach(t => (t.innerHTML = ''));

    const isSats = currentUnit === 'SATS';

    transactions.buys.forEach((buy, index) => {
        document.getElementById('buys-table').querySelector('tbody').innerHTML += `
            <tr>
                <td>${buy.date}</td>
                <td>${isSats ? convertToSatoshis(buy.amount).toFixed(0) : buy.amount.toFixed(8)} ${currentUnit}</td>
                <td>$${buy.price.toFixed(2)}</td>
                <td>$${buy.fees.toFixed(2)}</td>
                <td>${isSats ? convertToSatoshis(buy.remaining).toFixed(0) : buy.remaining.toFixed(8)} ${currentUnit}</td>
                <td>
                    <button class="edit-btn" onclick="editTransaction('buy', ${index})">Edit</button>
                    <button class="delete-btn" onclick="deleteTransaction('buy', ${index})">Delete</button>
                </td>
            </tr>
        `;
    });

    transactions.sells.forEach((sell, index) => {
        document.getElementById('sells-table').querySelector('tbody').innerHTML += `
            <tr>
                <td>${sell.date}</td>
                <td>${isSats ? convertToSatoshis(sell.amount).toFixed(0) : sell.amount.toFixed(8)} ${currentUnit}</td>
                <td>$${sell.price.toFixed(2)}</td>
                <td>$${sell.fees.toFixed(2)}</td>
                <td>${sell.gainLoss.toFixed(2)} ${currentUnit}</td>
                <td>
                    <button class="edit-btn" onclick="editTransaction('sell', ${index})">Edit</button>
                    <button class="delete-btn" onclick="deleteTransaction('sell', ${index})">Delete</button>
                </td>
            </tr>
        `;
    });

    const gains = transactions.sells.reduce((sum, sell) => (sell.gainLoss > 0 ? sum + sell.gainLoss : sum), 0);
    const losses = transactions.sells.reduce((sum, sell) => (sell.gainLoss < 0 ? sum + sell.gainLoss : sum), 0);

    document.getElementById('total-gains').textContent = `${isSats ? convertToSatoshis(gains).toFixed(0) : gains.toFixed(8)} ${currentUnit}`;
    document.getElementById('total-losses').textContent = `${isSats ? convertToSatoshis(Math.abs(losses)).toFixed(0) : Math.abs(losses).toFixed(8)} ${currentUnit}`;
    document.getElementById('net-gain').textContent = `${isSats ? convertToSatoshis(gains + losses).toFixed(0) : (gains + losses).toFixed(8)} ${currentUnit}`;
}

function deleteTransaction(type, index) {
    const confirmDelete = confirm("Are you sure you want to delete this transaction?");
    if (!confirmDelete) return;

    if (type === 'buy') {
        transactions.buys.splice(index, 1);
    } else {
        transactions.sells.splice(index, 1);
    }

    localStorage.setItem('btcTransactions', JSON.stringify(transactions));
    updateUI();
}

function resetForm() {
    document.getElementById('type').value = 'buy';
    document.getElementById('date').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('price').value = '';
    document.getElementById('fees').value = '';

    const addButton = document.querySelector('.transaction-form button');
    addButton.textContent = 'Add';
    addButton.setAttribute('onclick', 'addTransaction()');
}

// Initialize UI
updateUI();