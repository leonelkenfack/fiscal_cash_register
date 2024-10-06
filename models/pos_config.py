from odoo import fields, models, api

class PosConfig(models.Model):
    _inherit = 'pos.config'

    auto_download_receipt = fields.Boolean(string='Auto Download Receipt', default=False)
