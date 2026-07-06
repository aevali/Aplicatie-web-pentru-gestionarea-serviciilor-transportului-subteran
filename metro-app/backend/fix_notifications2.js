const pool = require('./db');

async function fixNotifications() {
    try {
        const res = await pool.query(
            `UPDATE notificari 
             SET mesaj = REPLACE(mesaj, '. către', ' către')
             WHERE tip = 'transfer_bilet' AND mesaj LIKE '%. către%'
             RETURNING id_notificare, mesaj`
        );
        console.log(`Updated ${res.rowCount} notifications.`);
        res.rows.forEach(r => console.log(`[ID ${r.id_notificare}] New message: ${r.mesaj}`));
    } catch (err) {
        console.error('Error updating notifications:', err);
    } finally {
        pool.end();
    }
}

fixNotifications();
