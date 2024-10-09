from odoo import fields, models, api

class ResCompany(models.Model):
    _inherit = 'res.company'

    auto_download_receipt = fields.Boolean(string='Auto Download Receipt')
    
    @api.onchange("auto_download_receipt")
    def set_download_receipt(self):
        self.env['ir.config_parameter'].sudo().set_param('fiscal_cash_register.auto_download_receipt', self.auto_download_receipt)


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    auto_download_receipt = fields.Boolean(related='company_id.auto_download_receipt', readonly=False)


class PosConfig(models.Model):
    _inherit = 'pos.config'

    image = fields.Binary(string='Image', help="Set logo image for viewing it"
                                               "in POS Screen and Receipt")
