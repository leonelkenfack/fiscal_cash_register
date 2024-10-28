/** @odoo-module **/

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";



function addFiscalSection(order) {
    const lines = [];
    
    lines.push("nf_");

    try {
        if(order.partner.vat){
        lines.push(`CF^${order.partner.vat}`);
    }
    } catch (error) {
        
    }

    order.orderlines.forEach((line) => {
        const unit = line.product.uom_id ? line.product.uom_id[1] : "Units.";
        lines.push(`S^${line.full_product_name}^${(line.price * 100).toFixed(0)}^${(line.quantity * 1000).toFixed(0)}^${unit}^${line.vat_group||1}^${line.article_group ||1}`);
        if (line.discount > 0) {
            const discountValue = (line.discount * 100).toFixed(0);
            lines.push(`MV^${discountValue}`);
        }
    });

    order.paymentlines.forEach((payment) => {
        let paymentType;
        switch (payment.name) {
            case 'Cash':
                paymentType = 1;  
                break;
            case 'Card':
                paymentType = 2;  
                break;
            case 'Credit':
                paymentType = 3;  
                break;
            case 'Meal voucher':
                paymentType = 4;  
                break;
            case 'Value voucher':
                paymentType = 5;  
                break;
            case 'Voucher':
                paymentType = 6;  
                break;
            case 'Modern payment':
                paymentType = 7;  
                break;
            case 'Other methods':
                paymentType = 8;  
                break;
            default:
                paymentType = 9;  
        }
        const amount = (payment.amount).toFixed(0); 
        lines.push(`P^${paymentType}^${amount*100}`);
    });

    if (order.hasBankTerminal) {
        const terminalAmount = (order.total*100).toFixed(0); 
        lines.push(`DS^${terminalAmount}`);
    }
    lines.push(`TL^Order Subtotal:`)
    lines.push(`St${order.get_subtotal()*100}`)

    const displayText = `${order.name}, Total: ${order.get_subtotal()*100} ${ order.pos.currency.name}`;
    lines.push(`VB^${displayText}`);

    if(order.get_tax_details()){
        console.log(order.get_tax_details())
        // lines.push(`CF^${order.get_tax_details()}`); 

    }

    if (order.barcode) {
        lines.push(`CB^${order.barcode}^2`); 
    }

    return lines.join("\n");
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

    
    createOrderTxtFile(order) {
        const data = addFiscalSection(order);
        const blob = new Blob([data], { type: 'text/plain' });
        saveAs(blob, `${order.name}.txt`);
    },
    

    async validateOrder(isForceValidate) {
        await super.validateOrder(...arguments);
        const order = this.pos.get_order(); 
        // let auto_download_receipt = false 
        // let url = undefined  

        // try {
        //     const params = await this.pos.env.services.rpc('/fiscal_cash_register/configs')
        //     console.log(params);
        //     auto_download_receipt = params.auto_download_receipt;
        //     url = params.dude_com_url;
        // } catch (error) {
        //     console.log(error);
        // }

        console.log(order);

        // if (auto_download_receipt){
        this.createOrderTxtFile(order);
        // }
    }


});

