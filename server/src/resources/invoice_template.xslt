<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:n1="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <xsl:output method="html" indent="yes" encoding="UTF-8"/>
  <xsl:template match="/">
    <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial; font-size: 12px; color: #333; }
          .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ed1c24; padding-bottom: 10px; margin-bottom: 20px; }
          .company-info { font-weight: bold; font-size: 16px; color: #ed1c24; }
          .tax-info { font-size: 11px; margin-top: 5px; }
          .invoice-details { text-align: right; }
          .bill-to { margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .items-table th { background: #f8f8f8; border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table td { border: 1px solid #ddd; padding: 8px; }
          .totals { margin-top: 20px; text-align: right; }
          .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="company-info"><xsl:value-of select="//cac:AccountingSupplierParty/cac:Party/cac:PartyName/cbc:Name"/></div>
              <div class="tax-info">
                VKN: <xsl:value-of select="//cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID[@schemeID='VKN']"/><br/>
                V.Dairesi: <xsl:value-of select="//cac:AccountingSupplierParty/cac:Party/cac:PartyTaxScheme/cbc:TaxScheme/cbc:Name"/><br/>
                Adres: <xsl:value-of select="//cac:AccountingSupplierParty/cac:Party/cac:PostalAddress/cbc:StreetName"/>
              </div>
            </div>
            <div class="invoice-details">
              <h2 style="margin:0; color:#ed1c24;"><xsl:value-of select="//cbc:InvoiceTypeCode"/></h2>
              Fatura No: <xsl:value-of select="//cbc:ID"/><br/>
              Tarih: <xsl:value-of select="//cbc:IssueDate"/>
            </div>
          </div>

          <div class="bill-to">
            <strong>SAYIN:</strong><br/>
            <xsl:value-of select="//cac:AccountingCustomerParty/cac:Party/cac:PartyName/cbc:Name"/><br/>
            <xsl:if test="//cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID">
              VKN/TCKN: <xsl:value-of select="//cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID"/>
            </xsl:if>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Hizmet/Ürün</th>
                <th>Miktar</th>
                <th>Birim Fiyat</th>
                <th>KDV (%)</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="//cac:InvoiceLine">
                <tr>
                  <td><xsl:value-of select="cac:Item/cbc:Name"/></td>
                  <td><xsl:value-of select="cbc:InvoicedQuantity"/></td>
                  <td><xsl:value-of select="cac:Price/cbc:PriceAmount"/> ₺</td>
                  <td>%20</td>
                  <td><xsl:value-of select="cbc:LineExtensionAmount"/> ₺</td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>

          <div class="totals">
            <p>ARA TOPLAM: <xsl:value-of select="//cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount"/> ₺</p>
            <p>KDV TOPLAM: <xsl:value-of select="//cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount - //cac:LegalMonetaryTotal/cbc:TaxExclusiveAmount"/> ₺</p>
            <h3 style="color:#ed1c24;">GENEL TOPLAM: <xsl:value-of select="//cac:LegalMonetaryTotal/cbc:PayableAmount"/> ₺</h3>
          </div>

          <div class="footer">
            Bu belge 213 sayılı VUK hükümlerine göre elektronik ortamda düzenlenmiştir.<br/>
            GİB Onaylı / QNB Finansbank Altyapısı ile Hazırlanmıştır.
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
