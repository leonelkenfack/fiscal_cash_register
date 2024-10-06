/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";


function formatDate(date) {
    const options = { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return new Intl.DateTimeFormat('en-GB', options).format(date) + ' DST';
}

function calculateBCC(data) {
    let bcc = 0;
    for (let i = 0; i < data.length; i++) {
        bcc ^= data.charCodeAt(i); // Calcul du checksum (BCC)
    }
    return bcc.toString(16).toUpperCase(); // Retourne le checksum en hexadécimal
}

function formatOrderData(order) {
    let seq = 1; // Initialisation du compteur de séquence
    const formattedOrder = [];

    // Helper pour ajouter des blocs avec calcul de BCC
    function addBlock(command, data) {
        const len = data.length + 2; // Longueur du message (ajustée)
        const block = `<01><${len}><${seq}>${command}<DATA>${data}`;
        const bcc = calculateBCC(block);
        formattedOrder.push(`${block}<05><${bcc}><03>`);
        seq++;
    }

    // Nom de la commande et référence
    addBlock('CMD_ORDER', `Order Reference\t${order.name}`);

    // Date et heure de la commande
    addBlock('CMD_ORDER', `Date\t${formatDate(order.date_order)}`);

    // Détails du caissier (nom et ID fiscal)
    addBlock('CMD_ORDER', `Cashier Name\t${order.cashier.name}\nCashier ID\t${order.cashier.fiscal_id || "N/A"}`);

    // Lignes de commande avec taxes
    order.orderlines.forEach(line => {
        
        addBlock('CMD_ORDER_LINES', `CID\t${line.cid}\nProduct\t${line.full_product_name}\nPrice\t${line.price.toFixed(2)}\nQuantity\t${line.quantity.toFixed(3)}\nTax\t${(line.tax_ids && line.tax_ids.length > 0) ? line.tax_ids.join(',') : "N/A"}`);
    });

    // Lignes de paiement avec mode de paiement
    order.paymentlines.forEach(payment => {
        addBlock('CMD_PAYMENT_LINES', `CID\t${payment.cid}\nAmount\t${payment.amount.toFixed(2)}\nPayment Type\t${payment.name}\nPayment Mode\t${payment.payment_mode || "N/A"}`);
    });

    // Informations du client avec adresse complète
    if (order.partner) {
        addBlock('CMD_PARTNER', `Partner Name\t${order.partner.name}\nPhone\t${order.partner.phone || "N/A"}\nCountry\t${order.partner.country || "N/A"}\nVAT\t${order.partner.vat || "N/A"}\nAddress\t${order.partner.street || "N/A"}, ${order.partner.city || "N/A"}, ${order.partner.zip || "N/A"}`);
    }

    // Devise utilisée
    addBlock('CMD_ORDER', `Currency\t${(order.currency_id && order.currency_id.name) ? order.currency_id.name : 'Default' }`);

    return formattedOrder.join('\n');
}

function createOrderTxtFile(order) {
    const data = formatOrderData(order);
    const blob = new Blob([data], { type: 'text/plain' });
    saveAs(blob, `${order.name}.txt`);
}

function saveAs(blob, fileName) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}


patch(PaymentScreen.prototype, {
    
    setup() {
        super.setup(...arguments);
        this.orm = useService("orm");
    },

    // Override POS validateOrder method
    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        const order = this.pos.get_order();
        
        // try {
        //     const params = await this.orm.searchRead("ir.config_parameter", [["key", "=", "fiscal_cash_register.auto_download_receipt"]], ["value"]);
        //     console.log(params[0]);
        // } catch (error) {
        //     console.log(error);
        // }

        console.log(order);
        
        createOrderTxtFile(order);
    }


});

