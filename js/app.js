let transactions = JSON.parse(localStorage.getItem('btcTransactions')) || { buys: [], sells: [] };

function round(value, decimals = 2) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

function addTransaction() {
    const type = document.getElementById('type').value;
    const date = document.getElementById('date').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const price = parseFloat(document.getElementById('price').value);
    const fees = parseFloat(document.getElementById('fees').value);

    if (!date || isNaN(amount) || isNaN(price) || isNaN(fees)) {
        alert("❌ Please fill out all fields with valid data.");
        return;
    }

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

    transactions.buys.forEach((buy, index) => {
        document.getElementById('buys-table').querySelector('tbody').innerHTML += `
            <tr>
                <td>${buy.date}</td>
                <td>${buy.amount.toFixed(8)}</td>
                <td>$${buy.price.toFixed(2)}</td>
                <td>$${buy.fees.toFixed(2)}</td>
                <td>${buy.remaining.toFixed(8)}</td>
                <td><button onclick="editTransaction('buy', ${index})">Edit</button></td>
            </tr>
        `;
    });

    transactions.sells.forEach((sell, index) => {
        document.getElementById('sells-table').querySelector('tbody').innerHTML += `
            <tr>
                <td>${sell.date}</td>
                <td>${sell.amount.toFixed(8)}</td>
                <td>$${sell.price.toFixed(2)}</td>
                <td>$${sell.fees.toFixed(2)}</td>
                <td>$${sell.gainLoss.toFixed(2)}</td>
                <td><button onclick="editTransaction('sell', ${index})">Edit</button></td>
            </tr>
        `;
    });

    const gains = transactions.sells.reduce((sum, sell) => (sell.gainLoss > 0 ? sum + sell.gainLoss : sum), 0);
    const losses = transactions.sells.reduce((sum, sell) => (sell.gainLoss < 0 ? sum + sell.gainLoss : sum), 0);

    document.getElementById('total-gains').textContent = gains.toFixed(2);
    document.getElementById('total-losses').textContent = Math.abs(losses).toFixed(2);
    document.getElementById('net-gain').textContent = (gains + losses).toFixed(2);
}

function clearBuys() {
    const confirmDelete = confirm("Are you sure you want to delete all buy transactions? This cannot be undone.");
    if (!confirmDelete) return;

    transactions.buys = [];
    localStorage.setItem('btcTransactions', JSON.stringify(transactions));
    updateUI();
}

function clearSells() {
    const confirmDelete = confirm("Are you sure you want to delete all sell transactions? This cannot be undone.");
    if (!confirmDelete) return;

    console.log("🗑 Deleting all sell transactions...");

    // Clear the sells array
    transactions.sells = [];
    console.log("✅ Sell transactions cleared:", transactions.sells);

    // Reset "remaining" BTC for all buys to their original "amount"
    transactions.buys = transactions.buys.map(buy => {
        console.log(`🔄 Resetting buy: ${buy.date}, Original Amount: ${buy.amount}`);
        buy.remaining = buy.amount; // Reset remaining BTC
        return buy;
    });

    console.log("✅ Buys reset:", transactions.buys);

    // Save updated transactions to localStorage
    localStorage.setItem('btcTransactions', JSON.stringify(transactions));
    console.log("💾 Transactions saved to localStorage.");

    // Update the UI
    updateUI();
    console.log("✅ UI updated.");
}

function resetForm() {
    document.getElementById('type').value = 'buy';
    document.getElementById('date').value = '';
    document.getElementById('amount').value = '';
    document.getElementById('price').value = '';
    document.getElementById('fees').value = '';
}

// Initialize UI
updateUI();