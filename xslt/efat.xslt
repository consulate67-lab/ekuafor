<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform" exclude-result-prefixes="cac cbc ccts clm54217 clm5639 clm66411 clmIANAMIMEMediaType fn link n1 qdt udt xbrldi xbrli xdt xlink xs xsd xsi"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:ccts="urn:un:unece:uncefact:documentation:2"
    xmlns:clm54217="urn:un:unece:uncefact:codelist:specification:54217:2001"
    xmlns:clm5639="urn:un:unece:uncefact:codelist:specification:5639:1988"
    xmlns:clm66411="urn:un:unece:uncefact:codelist:specification:66411:2001"
    xmlns:clmIANAMIMEMediaType="urn:un:unece:uncefact:codelist:specification:IANAMIMEMediaType:2003"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:link="http://www.xbrl.org/2003/linkbase"
    xmlns:n1="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
    xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"
    xmlns:xbrldi="http://xbrl.org/2006/xbrldi"
    xmlns:xbrli="http://www.xbrl.org/2003/instance"
    xmlns:xdt="http://www.w3.org/2005/xpath-datatypes"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
    xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
    xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
    <xsl:decimal-format name="european" decimal-separator="," grouping-separator="." NaN="" />
    <xsl:output version="4.0" method="html" indent="no" encoding="UTF-8" doctype-public="-//W3C//DTD HTML 4.01 Transitional//EN" doctype-system="http://www.w3.org/TR/html4/loose.dtd" />
    <xsl:param name="SV_OutputFormat" select="'HTML'" />
    <xsl:variable name="XML" select="/" />
    <xsl:key name="unitcode" match="cbc:InvoicedQuantity" use="@unitCode" />
    <xsl:template match="/">
        <html>
            <head>                
                <title />
                <style type="text/css">
                    body {
                        background-color: #FFFFFF;
                        font-family: 'Tahoma', "Times New Roman", Times, serif;
                        font-size: 11px;
                        color: #666666;
                    }
                    h1, h2 {
                        padding-bottom: 3px;
                        padding-top: 3px;
                        margin-bottom: 5px;
                        text-transform: uppercase;
                        font-family: Arial, Helvetica, sans-serif;
                    }
                    h1 {
                        font-size: 1.4em;
                        text-transform:none;
                    }
                    h2 {
                        font-size: 1em;
                        color: brown;
                    }
                    h3 {
                        font-size: 1em;
                        color: #333333;
                        text-align: justify;
                        margin: 0;
                        padding: 0;
                    }
                    h4 {
                        font-size: 1.1em;
                        font-style: bold;
                        font-family: Arial, Helvetica, sans-serif;
                        color: #000000;
                        margin: 0;
                        padding: 0;
                    }
                    hr {
                        height:2px;
                        color: #000000;
                        background-color: #000000;
                        border-bottom: 1px solid #000000;
                    }
                    p, ul, ol {
                        margin-top: 1.5em;
                    }
                    ul, ol {
                        margin-left: 3em;
                    }
                    blockquote {
                        margin-left: 3em;
                        margin-right: 3em;
                        font-style: italic;
                    }
                    a {
                        text-decoration: none;
                        color: #70A300;
                    }
                    a:hover {
                        border: none;
                        color: #70A300;
                    }
                    #despatchTable {
                        border-collapse:collapse;
                        font-size:11px;
                        float:right;
                        border-color:gray;
                    }
                    #ettnTable {
                        border-collapse:collapse;
                        font-size:11px;
                        border-color:gray;
                    }
                    #customerPartyTable {
                        border-width: 0px;
                        border-spacing:;
                        border-style: inset;
                        border-color: gray;
                        border-collapse: collapse;
                        background-color:
                    }
                    #customerIDTable {
                        border-width: 2px;
                        border-spacing:;
                        border-style: inset;
                        border-color: gray;
                        border-collapse: collapse;
                        background-color:
                    }
                    #customerIDTableTd {
                        border-width: 2px;
                        border-spacing:;
                        border-style: inset;
                        border-color: gray;
                        border-collapse: collapse;
                        background-color:
                    }
                    #lineTable {
                        border-width:2px;
                        border-spacing:;
                        border-style: inset;
                        border-color: black;
                        border-collapse: collapse;
                        background-color:;
                    }
                    #lineTableTd {
                        border-width: 1px;
                        padding: 1px;
                        border-style: inset;
                        border-color: black;
                        background-color: white;
                    }
                    #lineTableTr {
                        border-width: 1px;
                        padding: 0px;
                        border-style: inset;
                        border-color: black;
                        background-color: white;
                        -moz-border-radius:;
                    }
                    #lineTableDummyTd {
                        border-width: 1px;
                        border-color:white;
                        padding: 1px;
                        border-style: inset;
                        border-color: black;
                        background-color: white;
                    }
                    #lineTableBudgetTd {
                        border-width: 2px;
                        border-spacing:0px;
                        padding: 1px;
                        border-style: inset;
                        border-color: black;
                        background-color: white;
                        -moz-border-radius:;
                    }
                    #notesTable {
                        border-width: 2px;
                        border-spacing:;
                        border-style: inset;
                        border-color: black;
                        border-collapse: collapse;
                        background-color:
                    }
                    #notesTableTd {
                        border-width: 0px;
                        border-spacing:;
                        border-style: inset;
                        border-color: black;
                        border-collapse: collapse;
                        background-color:
                    }
                    table {
                        border-spacing:0px;
                    }
                    #budgetContainerTable {
                        border-width: 0px;
                        border-spacing: 0px;
                        border-style: inset;
                        border-color: black;
                        border-collapse: collapse;
                        background-color:;
                    }
                    td {
                        border-color:gray;
                    }</style>
                <title>e-Fatura</title>
            </head>
            <body style="margin-left=0.6in; margin-right=0.6in; margin-top=0.79in; margin-bottom=0.79in">
                <xsl:for-each select="$XML">
                    <table style="border-color:blue; " border="0" cellspacing="0px" width="800" cellpadding="0px">
                        <tbody>
                            <tr valign="top">
                                <td width="40%">
                                    <br />
                                    <table align="center" border="0" width="100%">
                                        <tbody>
                                            <hr />
                                            <tr align="left">
                                                <xsl:for-each select="n1:Invoice">
                                                    <xsl:for-each select="cac:AccountingSupplierParty">
                                                        <xsl:for-each select="cac:Party">
                                                            <td align="left">
                                                                <xsl:if test="cac:PartyName">
                                                                    <xsl:value-of select="cac:PartyName/cbc:Name" />
                                                                    <br />
                                                                </xsl:if>
                                                                <xsl:for-each select="cac:Person">
                                                                    <xsl:for-each select="cbc:Title">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                    <xsl:for-each select="cbc:FirstName">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                    <xsl:for-each select="cbc:MiddleName">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                    <xsl:for-each select="cbc:FamilyName">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                    <xsl:for-each select="cbc:NameSuffix">
                                                                        <xsl:apply-templates />
                                                                    </xsl:for-each>
                                                                </xsl:for-each>
                                                            </td>
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </xsl:for-each>
                                            </tr>
                                            <tr align="left">
                                                <xsl:for-each select="n1:Invoice">
                                                    <xsl:for-each select="cac:AccountingSupplierParty">
                                                        <xsl:for-each select="cac:Party">
                                                            <td align="left">
                                                                <xsl:for-each select="cac:PostalAddress">
                                                                    <xsl:for-each select="cbc:StreetName">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                    <xsl:for-each select="cbc:BuildingName">
                                                                        <xsl:apply-templates />
                                                                    </xsl:for-each>
                                                                    <xsl:if test="cbc:BuildingNumber">
                                                                        <span>
                                                                            <xsl:text> No:</xsl:text>
                                                                        </span>
                                                                        <xsl:for-each select="cbc:BuildingNumber">
                                                                            <xsl:apply-templates />
                                                                        </xsl:for-each>
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:if>
                                                                    <br />
                                                                    <xsl:for-each select="cbc:PostalZone">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                    <xsl:for-each select="cbc:CitySubdivisionName">
                                                                        <xsl:apply-templates />
                                                                    </xsl:for-each>
                                                                    <span>
                                                                        <xsl:text>/ </xsl:text>
                                                                    </span>
                                                                    <xsl:for-each select="cbc:CityName">
                                                                        <xsl:apply-templates />
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                </xsl:for-each>
                                                            </td>
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </xsl:for-each>
                                            </tr>
                                            <xsl:if test="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telephone or //n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telefax">
                                                <tr align="left">
                                                    <xsl:for-each select="n1:Invoice">
                                                        <xsl:for-each select="cac:AccountingSupplierParty">
                                                            <xsl:for-each select="cac:Party">
                                                                <td align="left">
                                                                    <xsl:for-each select="cac:Contact">
                                                                        <xsl:if test="cbc:Telephone">
                                                                            <span>
                                                                                <xsl:text>Tel: </xsl:text>
                                                                            </span>
                                                                            <xsl:for-each select="cbc:Telephone">
                                                                                <xsl:apply-templates />
                                                                            </xsl:for-each>
                                                                        </xsl:if>
                                                                        <xsl:if test="cbc:Telefax">
                                                                            <span>
                                                                                <xsl:text> Fax: </xsl:text>
                                                                            </span>
                                                                            <xsl:for-each select="cbc:Telefax">
                                                                                <xsl:apply-templates />
                                                                            </xsl:for-each>
                                                                        </xsl:if>
                                                                        <span>
                                                                            <xsl:text></xsl:text>
                                                                        </span>
                                                                    </xsl:for-each>
                                                                </td>
                                                            </xsl:for-each>
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </tr>
                                            </xsl:if>
                                            <xsl:for-each select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cbc:WebsiteURI">
                                                <tr align="left">
                                                    <td>
                                                        <xsl:text>Web Sitesi: </xsl:text>
                                                        <xsl:value-of select="." />
                                                    </td>
                                                </tr>
                                            </xsl:for-each>
                                            <xsl:for-each select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:ElectronicMail">
                                                <tr align="left">
                                                    <td>
                                                        <xsl:text>E-Posta: </xsl:text>
                                                        <xsl:value-of select="." />
                                                    </td>
                                                </tr>
                                            </xsl:for-each>
                                            <tr align="left">
                                                <xsl:for-each select="n1:Invoice">
                                                    <xsl:for-each select="cac:AccountingSupplierParty">
                                                        <xsl:for-each select="cac:Party">
                                                            <td align="left">
                                                                <span>
                                                                    <xsl:text>Vergi Dairesi: </xsl:text>
                                                                </span>
                                                                <xsl:for-each select="cac:PartyTaxScheme">
                                                                    <xsl:for-each select="cac:TaxScheme">
                                                                        <xsl:for-each select="cbc:Name">
                                                                            <xsl:apply-templates />
                                                                        </xsl:for-each>
                                                                    </xsl:for-each>
                                                                    <span>
                                                                        <xsl:text></xsl:text>
                                                                    </span>
                                                                </xsl:for-each>
                                                            </td>
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </xsl:for-each>
                                            </tr>
                                            <xsl:for-each select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification">
                                                <tr align="left">
                                                    <td>
                                                        <xsl:value-of select="cbc:ID/@schemeID" />
                                                        <xsl:text>: </xsl:text>
                                                        <xsl:value-of select="cbc:ID" />
                                                    </td>
                                                </tr>
                                            </xsl:for-each>
                                        </tbody>
                                    </table>
                                    <hr />
                                </td>
                                <td width="20%" align="center" valign="middle">
                                    <br />
                                    <br />
                                    <img style="width:91px;" align="middle" alt="E-Fatura Logo" src="data:image/jpeg;base64,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" />
                                    <h1 align="center">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>e-FATURA</xsl:text>
                                        </span>
                                    </h1>
                                </td>
                                <td align="right" width="40%" valign="right">
                                 <img src="{$QRSOVOS}" alt="qrcode" width="175px" />
                             <xsl:text>
                         </xsl:text>    
                                <img src="data:image/jpeg;base64,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" />
                                </td>
                            </tr>
                            <tr style="height:118px; " valign="top">
                                <td width="40%" align="right" valign="bottom">
                                    <table id="customerPartyTable" align="left" border="0" height="50%">
                                        <tbody>
                                            <tr style="height:71px; ">
                                                <td>
                                                    <hr />
                                                    <table align="center" border="0">
                                                        <tbody>
                                                            <tr>
                                                                <xsl:for-each select="n1:Invoice">
                                                                    <xsl:for-each select="cac:AccountingCustomerParty">
                                                                        <xsl:for-each select="cac:Party">
                                                                            <td style="width:469px; " align="left">
                                                                                <span style="font-weight:bold; ">
                                                                                    <xsl:text>SAYIN</xsl:text>
                                                                                </span>
                                                                            </td>
                                                                        </xsl:for-each>
                                                                    </xsl:for-each>
                                                                </xsl:for-each>
                                                            </tr>
                                                            <tr>
                                                                <xsl:for-each select="n1:Invoice">
                                                                    <xsl:for-each select="cac:AccountingCustomerParty">
                                                                        <xsl:for-each select="cac:Party">
                                                                            <td style="width:469px; " align="left">
                                                                                <xsl:for-each select="cac:Person">
                                                                                    <xsl:for-each select="cbc:Title">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:FirstName">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:MiddleName">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:FamilyName">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:NameSuffix">
                                                                                        <xsl:apply-templates />
                                                                                    </xsl:for-each>
                                                                                </xsl:for-each>
                                                                            </td>
                                                                        </xsl:for-each>
                                                                    </xsl:for-each>
                                                                </xsl:for-each>
                                                            </tr>
                                                            <tr>
                                                                <xsl:for-each select="n1:Invoice">
                                                                    <xsl:for-each select="cac:AccountingCustomerParty">
                                                                        <xsl:for-each select="cac:Party">
                                                                            <td style="width:469px; " align="left">
                                                                                <xsl:for-each select="cac:PostalAddress">
                                                                                    <xsl:for-each select="cbc:StreetName">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:BuildingName">
                                                                                        <xsl:apply-templates />
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:BuildingNumber">
                                                                                        <span>
                                                                                            <xsl:text> No:</xsl:text>
                                                                                        </span>
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <br />
                                                                                    <xsl:for-each select="cbc:Room">
                                                                                        <span>
                                                                                            <xsl:text>Kapi No:</xsl:text>
                                                                                        </span>
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <br />
                                                                                    <xsl:for-each select="cbc:PostalZone">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:CitySubdivisionName">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text>/ </xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                    <xsl:for-each select="cbc:CityName">
                                                                                        <xsl:apply-templates />
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </xsl:for-each>
                                                                                </xsl:for-each>
                                                                            </td>
                                                                        </xsl:for-each>
                                                                    </xsl:for-each>
                                                                </xsl:for-each>
                                                            </tr>
                                                            <xsl:for-each select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cbc:WebsiteURI">
                                                                <tr align="left">
                                                                    <td>
                                                                        <xsl:text>Web Sitesi: </xsl:text>
                                                                        <xsl:value-of select="." />
                                                                    </td>
                                                                </tr>
                                                            </xsl:for-each>
                                                            <xsl:for-each select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:ElectronicMail">
                                                                <tr align="left">
                                                                    <td>
                                                                        <xsl:text>E-Posta: </xsl:text>
                                                                        <xsl:value-of select="." />
                                                                    </td>
                                                                </tr>
                                                            </xsl:for-each>
                                                            <xsl:for-each select="n1:Invoice">
                                                                <xsl:for-each select="cac:AccountingCustomerParty">
                                                                    <xsl:for-each select="cac:Party">
                                                                        <xsl:for-each select="cac:Contact">
                                                                            <xsl:if test="cbc:Telephone or cbc:Telefax">
                                                                                <tr align="left">
                                                                                    <td style="width:469px; " align="left">
                                                                                        <xsl:for-each select="cbc:Telephone">
                                                                                            <span>
                                                                                                <xsl:text>Tel: </xsl:text>
                                                                                            </span>
                                                                                            <xsl:apply-templates />
                                                                                        </xsl:for-each>
                                                                                        <xsl:for-each select="cbc:Telefax">
                                                                                            <span>
                                                                                                <xsl:text> Fax: </xsl:text>
                                                                                            </span>
                                                                                            <xsl:apply-templates />
                                                                                        </xsl:for-each>
                                                                                        <span>
                                                                                            <xsl:text></xsl:text>
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            </xsl:if>
                                                                            <xsl:if test="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name">
                                                                                <tr align="left">
                                                                                    <td>
                                                                                        <span>
                                                                                            <xsl:text>Vergi Dairesi: </xsl:text>
                                                                                            <xsl:value-of select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name" />
                                                                                        </span>
                                                                                    </td>
                                                                                </tr>
                                                                            </xsl:if>
                                                                        </xsl:for-each>
                                                                    </xsl:for-each>
                                                                </xsl:for-each>
                                                            </xsl:for-each>
                                                            <xsl:for-each select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification">
                                                                <tr align="left">
                                                                    <td>
                                                                        <xsl:value-of select="cbc:ID/@schemeID" />
                                                                        <xsl:text>: </xsl:text>
                                                                        <xsl:value-of select="cbc:ID" />
                                                                    </td>
                                                                </tr>
                                                            </xsl:for-each>
                                                        </tbody>
                                                    </table>
                                                    <hr />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <br />
                                </td>
                                <td width="60%" align="center" valign="bottom" colspan="2">
                                    <table border="1" height="13" id="despatchTable">
                                        <tbody>
                                            <tr>
                                                <td style="width:105px;" align="left">
                                                    <span style="font-weight:bold; ">
                                                        <xsl:text>Özellestirme No:</xsl:text>
                                                    </span>
                                                </td>
                                                <td style="width:110px;" align="left">
                                                    <xsl:for-each select="n1:Invoice">
                                                        <xsl:for-each select="cbc:CustomizationID">
                                                            <xsl:apply-templates />
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                    <span style="font-weight:bold; ">
                                                        <xsl:text>Senaryo:</xsl:text>
                                                    </span>
                                                </td>
                                                <td align="left">
                                                    <xsl:for-each select="n1:Invoice">
                                                        <xsl:for-each select="cbc:ProfileID">
                                                            <xsl:apply-templates />
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                    <span style="font-weight:bold; ">
                                                        <xsl:text>Fatura Tipi:</xsl:text>
                                                    </span>
                                                </td>
                                                <td align="left">
                                                    <xsl:for-each select="n1:Invoice">
                                                        <xsl:for-each select="cbc:InvoiceTypeCode">
                                                            <xsl:apply-templates />
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                    <span style="font-weight:bold; ">
                                                        <xsl:text>Fatura No:</xsl:text>
                                                    </span>
                                                </td>
                                                <td align="left">
                                                    <xsl:for-each select="n1:Invoice">
                                                        <xsl:for-each select="cbc:ID">
                                                            <xsl:apply-templates />
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                    <span style="font-weight:bold; ">
                                                        <xsl:text>Fatura Tarihi:</xsl:text>
                                                    </span>
                                                </td>
                                                <td align="left">
                                                    <xsl:for-each select="n1:Invoice">
                                                        <xsl:for-each select="cbc:IssueDate">
                                                            <xsl:value-of select="substring(.,9,2)" />-
                                                            <xsl:value-of select="substring(.,6,2)" />-
                                                            <xsl:value-of select="substring(.,1,4)" />
                                                        </xsl:for-each>
                                                    </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                    <span style="font-weight:bold; ">
                                                    <xsl:text>Fatura Zamanı:</xsl:text>
                                                    </span>
                                                </td>
                                                <td align="left">
                                                <xsl:for-each select="n1:Invoice/cbc:IssueTime">
                                                        <xsl:apply-templates select="." />
                                                    </xsl:for-each>
                                                </td>
                                            </tr>
                                            <xsl:for-each select="n1:Invoice/cac:DespatchDocumentReference">
                                                <tr style="height:13px; ">
                                                    <td align="left">
                                                        <span style="font-weight:bold; ">
                                                            <xsl:text>Irsaliye No:</xsl:text>
                                                        </span>
                                                        <span>
                                                            <xsl:text></xsl:text>
                                                        </span>
                                                    </td>
                                                    <td align="left">
                                                        <xsl:value-of select="cbc:ID" />
                                                    </td>
                                                </tr>
                                                <tr style="height:13px; ">
                                                    <td align="left">
                                                        <span style="font-weight:bold; ">
                                                            <xsl:text>Irsaliye Tarihi:</xsl:text>
                                                        </span>
                                                    </td>
                                                    <td align="left">
                                                        <xsl:for-each select="cbc:IssueDate">
                                                            <xsl:value-of select="substring(.,9,2)" />-
                                                            <xsl:value-of select="substring(.,6,2)" />-
                                                            <xsl:value-of select="substring(.,1,4)" />
                                                        </xsl:for-each>
                                                    </td>
                                                </tr>
                                            </xsl:for-each>
                                            <xsl:if test="//n1:Invoice/cac:OrderReference">
                                                <tr style="height:13px">
                                                    <td align="left">
                                                        <span style="font-weight:bold; ">
                                                            <xsl:text>Siparis No:</xsl:text>
                                                        </span>
                                                    </td>
                                                    <td align="left">
                                                        <xsl:for-each select="n1:Invoice/cac:OrderReference">
                                                            <xsl:for-each select="cbc:ID">
                                                                <xsl:apply-templates />
                                                            </xsl:for-each>
                                                        </xsl:for-each>
                                                    </td>
                                                </tr>
                                            </xsl:if>
                                            <xsl:if test="//n1:Invoice/cac:OrderReference/cbc:IssueDate">
                                                <tr style="height:13px">
                                                    <td align="left">
                                                        <span style="font-weight:bold; ">
                                                            <xsl:text>Siparis Tarihi:</xsl:text>
                                                        </span>
                                                    </td>
                                                    <td align="left">
                                                        <xsl:for-each select="n1:Invoice/cac:OrderReference">
                                                            <xsl:for-each select="cbc:IssueDate">
                                                                <xsl:value-of select="substring(.,9,2)" />-
                                                                <xsl:value-of select="substring(.,6,2)" />-
                                                                <xsl:value-of select="substring(.,1,4)" />
                                                            </xsl:for-each>
                                                        </xsl:for-each>
                                                    </td>
                                                </tr>
                                            </xsl:if>
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                            <tr align="left">
                                <table id="ettnTable">
                                    <tr style="height:13px;">
                                        <td align="left" valign="top">
                                            <span style="font-weight:bold; ">
                                                <xsl:text>ETTN:</xsl:text>
                                            </span>
                                        </td>
                                        <td align="left" width="240px">
                                            <xsl:for-each select="n1:Invoice">
                                                <xsl:for-each select="cbc:UUID">
                                                    <xsl:apply-templates />
                                                </xsl:for-each>
                                            </xsl:for-each>
                                        </td>
                                    </tr>
                                </table>
                            </tr>
                        </tbody>
                    </table>
                    <div id="lineTableAligner">
                        <span>
                            <xsl:text></xsl:text>
                        </span>
                    </div>
                    <table border="1" id="lineTable" width="800">
                        <tbody>
                            <tr id="lineTableTr">
                                <td id="lineTableTd" style="width:3%">
                                    <span style="font-weight:bold; " align="center">
                                        <xsl:text>Sira No</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:20%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Mal Hizmet</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:7.4%" align="center">
                                    <span style="font-weight:bold;">
                                        <xsl:text>Miktar</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:9%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Birim Fiyat</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:7%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Iskonto Orani</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:9%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Iskonto Tutari</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:7%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>KDV Orani</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:10%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>KDV Tutari</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:17%; " align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Diger Vergiler</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableTd" style="width:10.6%" align="center">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Mal Hizmet Tutari</xsl:text>
                                    </span>
                                </td>
                            </tr>
                            <xsl:apply-templates select="//n1:Invoice/cac:InvoiceLine" />
                        </tbody>
                    </table>
                </xsl:for-each>
                <tr>
          <td colspan="3" style="text-align:right;">
            <b>Toplam Miktar : </b>
          </td>
          <td style="border:1px solid gray; " colspan="4">
            <xsl:text> </xsl:text>
            <xsl:for-each select="//cbc:InvoicedQuantity[generate-id(.)=generate-id(key('unitcode', @unitCode)[1])]">
              <xsl:variable name="uCode">
                <xsl:value-of select="@unitCode" />
              </xsl:variable>
              <xsl:variable name="lstInvoiceQ" select="//cbc:InvoicedQuantity[@unitCode=$uCode]" />
              <xsl:call-template name="ShowEmployeesInTeam">
                <xsl:with-param name="lstInvoiceQ" select="$lstInvoiceQ" />
              </xsl:call-template>
            </xsl:for-each>
          </td>
        </tr>
                <table id="budgetContainerTable" width="800px">
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd" />
                        <td id="lineTableBudgetTd" align="right" width="300px">
                            <span style="font-weight:bold; ">
                                <xsl:text>Mal Hizmet Toplam Tutari</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:81px; " align="right">
                            <span>
                                <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount, '###.##0,00', 'european')" />
                                <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID">
                                    <xsl:text></xsl:text>
                                    <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID = 'TRL' or  //n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID = 'TRY'">
                                        <xsl:text>TL</xsl:text>
                                    </xsl:if>
                                    <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID != 'TRL' and  //n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID != 'TRY' ">
                                        <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID" />
                                    </xsl:if>
                                </xsl:if>
                            </span>
                        </td>
                    </tr>
                    <xsl:for-each select="n1:Invoice/cac:TaxTotal/cac:TaxSubtotal">
                        <xsl:if test="cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '4171'">
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" align="right" width="200px">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Teslim Bedeli</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:81px; " align="right">
                                    <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount, '###.##0,00', 'european')" />
                                    <xsl:call-template name="CurrencyInfo">
                                        <xsl:with-param name="cid" select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID" />
                                    </xsl:call-template>
                                </td>
                            </tr>
                        </xsl:if>
                    </xsl:for-each>
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd" />
                        <td id="lineTableBudgetTd" align="right" width="300px">
                            <span style="font-weight:bold; ">
                                <xsl:text>Toplam Iskonto</xsl:text>
                                <xsl:if test="//n1:Invoice/cac:AllowanceCharge/cbc:MultiplierFactorNumeric">
                                    <xsl:text></xsl:text>
                                    <xsl:text>(%</xsl:text>
                                    <xsl:value-of select="//n1:Invoice/cac:AllowanceCharge/cbc:MultiplierFactorNumeric * 100" />
                                    <xsl:text>)</xsl:text>
                                </xsl:if>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:81px; " align="right">
                            <span>
                                <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount, '###.##0,00', 'european')" />
                                <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID">
                                    <xsl:text></xsl:text>
                                    <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID = 'TRL' or  //n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID = 'TRY'">
                                        <xsl:text>TL</xsl:text>
                                    </xsl:if>
                                    <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID != 'TRL'  and  //n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID != 'TRY'">
                                        <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID" />
                                    </xsl:if>
                                </xsl:if>
                            </span>
                        </td>
                    </tr>
                    <xsl:for-each select="n1:Invoice/cac:TaxTotal/cac:TaxSubtotal">
                        <xsl:if test="cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015'">
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" width="300px" align="right">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>KDV Matrahı </xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                    <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                                        <xsl:text></xsl:text>
                                        <xsl:value-of select="format-number(../../cbc:TaxableAmount, '###.##0,00', 'european')" />
                                        <xsl:if test="../../cbc:TaxableAmount/@currencyID">
                                            <xsl:text></xsl:text>
                                            <xsl:if test="../../cbc:TaxableAmount/@currencyID = 'TRL' or  ../../cbc:TaxableAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if test="../../cbc:TaxableAmount/@currencyID != 'TRL' and  ../../cbc:TaxableAmount/@currencyID != 'TRY'">
                                                <xsl:value-of select="../../cbc:TaxableAmount/@currencyID" />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </td>
                            </tr>
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" width="300px" align="right">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Hesaplanan </xsl:text>
                                        <xsl:value-of select="cac:TaxCategory/cac:TaxScheme/cbc:Name" />
                                        <xsl:text>(%</xsl:text>
                                        <xsl:value-of select="cbc:Percent" />
                                        <xsl:text>)</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                    <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                                        <xsl:text></xsl:text>
                                        <xsl:value-of select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')" />
                                        <xsl:if test="../../cbc:TaxAmount/@currencyID">
                                            <xsl:text></xsl:text>
                                            <xsl:if test="../../cbc:TaxAmount/@currencyID = 'TRL' or  ../../cbc:TaxableAmount/@currencyID = 'TRY' ">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if test="../../cbc:TaxAmount/@currencyID != 'TRL'  and  ../../cbc:TaxableAmount/@currencyID != 'TRY' ">
                                                <xsl:value-of select="../../cbc:TaxAmount/@currencyID" />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </td>
                            </tr>
                        </xsl:if>
                    </xsl:for-each>
                    <xsl:for-each select="n1:Invoice/cac:TaxTotal/cac:TaxSubtotal">
                        <xsl:if test="cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode != '0015'">
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" width="300px" align="right">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Hesaplanan </xsl:text>
                                        <xsl:value-of select="cac:TaxCategory/cac:TaxScheme/cbc:Name" />
                                        <xsl:text>(%</xsl:text>
                                        <xsl:value-of select="cbc:Percent" />
                                        <xsl:text>)</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                    <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                                        <xsl:text></xsl:text>
                                        <xsl:value-of select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')" />
                                        <xsl:if test="../../cbc:TaxAmount/@currencyID">
                                            <xsl:text></xsl:text>
                                            <xsl:if test="../../cbc:TaxAmount/@currencyID = 'TRL' or  ../../cbc:TaxableAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if test="../../cbc:TaxAmount/@currencyID != 'TRL' and  ../../cbc:TaxableAmount/@currencyID != 'TRY'">
                                                <xsl:value-of select="../../cbc:TaxAmount/@currencyID" />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </td>
                            </tr>
                        </xsl:if>
                    </xsl:for-each>
                    <xsl:for-each select="n1:Invoice/cac:TaxTotal/cac:TaxSubtotal">
                        <xsl:if test="cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '4171'">
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" align="right" width="200px">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>KDV Matrahı</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:81px; " align="right">
                                    <xsl:value-of select="format-number(sum(//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=0015]/cbc:TaxableAmount), '###.##0,00', 'european')" />
                                    <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID">
                                        <xsl:text></xsl:text>
                                        <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRY'">
                                            <xsl:text>TL</xsl:text>
                                        </xsl:if>
                                        <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRY'">
                                            <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID" />
                                        </xsl:if>
                                    </xsl:if>
                                </td>
                            </tr>
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" align="right" width="200px">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Tevkifat Dahil Toplam Tutar</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:81px; " align="right">
                                    <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount, '###.##0,00', 'european')" />
                                    <xsl:call-template name="CurrencyInfo">
                                        <xsl:with-param name="cid" select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID" />
                                    </xsl:call-template>
                                </td>
                            </tr>
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" align="right" width="200px">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Tevkifat Hariç Toplam Tutar</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:81px; " align="right">
                                    <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount, '###.##0,00', 'european')" />
                                    <xsl:call-template name="CurrencyInfo">
                                        <xsl:with-param name="cid" select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID" />
                                    </xsl:call-template>
                                </td>
                            </tr>
                        </xsl:if>
                    </xsl:for-each>
                    <xsl:if test="n1:Invoice/cac:WithholdingTaxTotal">
                        <xsl:for-each select="n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal">
                            <tr id="budgetContainerTr" align="right">
                                <td id="budgetContainerDummyTd" />
                                <td id="lineTableBudgetTd" width="300px" align="right">
                                    <span style="font-weight:bold; ">
                                        <xsl:text>Hesaplanan KDV Tevkifat</xsl:text>
                                        <xsl:text>(%</xsl:text>
                                        <xsl:value-of select="cbc:Percent" />
                                        <xsl:text>)</xsl:text>
                                    </span>
                                </td>
                                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                    <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                                        <xsl:text></xsl:text>
                                        <xsl:value-of select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')" />
                                        <xsl:if test="../../cbc:TaxAmount/@currencyID">
                                            <xsl:text></xsl:text>
                                            <xsl:if test="../../cbc:TaxAmount/@currencyID = 'TRL' or  ../../cbc:TaxableAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if test="../../cbc:TaxAmount/@currencyID != 'TRL' and  ../../cbc:TaxableAmount/@currencyID != 'TRY'">
                                                <xsl:value-of select="../../cbc:TaxAmount/@currencyID" />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </td>
                            </tr>
                        </xsl:for-each>
                    </xsl:if>
                    <xsl:if test="sum(n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:TaxableAmount)&gt;0">
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="211px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Tevkifata Tabi İşlem Tutarı</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:value-of select="format-number(sum(n1:Invoice/cac:InvoiceLine[cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:LineExtensionAmount), '###.##0,00', 'european')" />
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                                    <xsl:text>TL</xsl:text>
                                </xsl:if>
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                                    <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode" />
                                </xsl:if>
                            </td>
                        </tr>
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="211px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Tevkifata Tabi İşlem Üzerinden Hes. KDV</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:value-of select="format-number(sum(n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:TaxableAmount), '###.##0,00', 'european')" />
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                                    <xsl:text>TL</xsl:text>
                                </xsl:if>
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                                    <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode" />
                                </xsl:if>
                            </td>
                        </tr>
                    </xsl:if>
                    <xsl:if test="n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]">
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="211px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Tevkifata Tabi İşlem Tutarı</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:if test="n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]">
                                    <xsl:value-of select="format-number(sum(n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]/cbc:LineExtensionAmount), '###.##0,00', 'european')" />
                                </xsl:if>
                                <xsl:if test="//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode='9015'">
                                    <xsl:value-of select="format-number(sum(n1:Invoice/cac:InvoiceLine[cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:LineExtensionAmount), '###.##0,00', 'european')" />
                                </xsl:if>
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                                    <xsl:text> TL</xsl:text>
                                </xsl:if>
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                                    <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode" />
                                </xsl:if>
                            </td>
                        </tr>
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="211px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Tevkifata Tabi İşlem Üzerinden Hes. KDV</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:if test="n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]">
                                    <xsl:value-of select="format-number(sum(n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme]/cbc:TaxableAmount), '###.##0,00', 'european')" />
                                </xsl:if>
                                <xsl:if test="//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode='9015'">
                                    <xsl:value-of select="format-number(sum(n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:TaxableAmount), '###.##0,00', 'european')" />
                                </xsl:if>
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                                    <xsl:text> TL</xsl:text>
                                </xsl:if>
                                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                                    <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode" />
                                </xsl:if>
                            </td>
                        </tr>
                    </xsl:if>
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd" />
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Vergiler Dahil Toplam Tutar</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                                <xsl:for-each select="cac:LegalMonetaryTotal">
                                    <xsl:for-each select="cbc:TaxInclusiveAmount">
                                        <xsl:value-of select="format-number(., '###.##0,00', 'european')" />
                                        <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID">
                                            <xsl:text></xsl:text>
                                            <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRY'">
                                                <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID" />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd" />
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Ödenecek Tutar</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                                <xsl:for-each select="cac:LegalMonetaryTotal">
                                    <xsl:for-each select="cbc:PayableAmount">
                                        <xsl:value-of select="format-number(., '###.##0,00', 'european')" />
                                        <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID">
                                            <xsl:text></xsl:text>
                                            <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID = 'TRY' ">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID != 'TRY'">
                                                <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID" />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
                    <xsl:if test="//n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and //n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="200px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Döviz Kuru</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:for-each select="n1:Invoice">
                                    <xsl:for-each select="cac:PricingExchangeRate">
                                        <xsl:for-each select="cbc:CalculationRate">
                                            <xsl:value-of select="." />
                                        </xsl:for-each>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </td>
                        </tr>
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="200px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Mal Hizmet Toplam Tutarı(TL)</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <span>
                                    <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount * //n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate, '###.##0,00', 'european')" />
                                    <xsl:text> TL</xsl:text>
                                </span>
                            </td>
                        </tr>
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="200px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Vergiler Dahil Toplam Tutar(TL)</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:for-each select="n1:Invoice">
                                    <xsl:variable name="myRate" select="./cac:PricingExchangeRate/cbc:CalculationRate" />
                                    <xsl:for-each select="cac:LegalMonetaryTotal">
                                        <xsl:for-each select="cbc:TaxInclusiveAmount">
                                            <xsl:value-of select="format-number(. * $myRate, '###.##0,00', 'european')" />
                                            <xsl:text> TL</xsl:text>
                                        </xsl:for-each>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </td>
                        </tr>
                        <tr id="budgetContainerTr" align="right">
                            <td id="budgetContainerDummyTd" />
                            <td id="lineTableBudgetTd" width="200px" align="right">
                                <span style="font-weight:bold; ">
                                    <xsl:text>Ödenecek Tutar(TL)</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd" style="width:82px; " align="right">
                                <xsl:for-each select="n1:Invoice">
                                    <xsl:variable name="myRate" select="./cac:PricingExchangeRate/cbc:CalculationRate" />
                                    <xsl:for-each select="cac:LegalMonetaryTotal">
                                        <xsl:for-each select="cbc:PayableAmount">
                                            <xsl:value-of select="format-number(. * $myRate, '###.##0,00', 'european')" />
                                            <xsl:text> TL</xsl:text>
                                        </xsl:for-each>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </td>
                        </tr>
                    </xsl:if>
                </table>
                <br />
                <table id="notesTable" width="800" align="left" height="100">
                    <tbody>
                        <tr align="left">
                            <td id="notesTableTd">
                                <xsl:for-each select="//n1:Invoice/cac:InvoiceLine">
                                    <xsl:if test="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason">
                                        <xsl:if test="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason  != ''">
                                            <b>
                                                <xsl:value-of select="cbc:ID" />. Kalem Vergi İstisna Muafiyet Sebebi:"
                                            </b>
                                            <xsl:value-of select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason" />
                                            <br />
                                        </xsl:if>
                                    </xsl:if>
                                </xsl:for-each>
                                <xsl:for-each select="//n1:Invoice/cac:TaxTotal">
                                    <xsl:if test="./cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason != ''">
                                        <xsl:if test="./cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason">
                                            <b>      Vergi İstisna Muafiyet Sebebi:</b>
                                            <xsl:value-of select="./cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason" />
                                            <br />
                                        </xsl:if>
                                    </xsl:if>
                                </xsl:for-each>
                                <xsl:for-each select="//n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                                    <b>      Tevkifat Sebebi: </b>
                                    <xsl:value-of select="cbc:TaxTypeCode" />
                                    <xsl:text>-</xsl:text>
                                    <xsl:value-of select="cbc:Name" />
                                    <br />
                                </xsl:for-each>
                                <b>      Yalnız: </b>
                                <xsl:for-each select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount">
                                    <xsl:call-template name="dovizi_oku">
                                        <xsl:with-param name="doviz" select="@currencyID" />
                                    </xsl:call-template>
                                </xsl:for-each>
                                <br />
                                <br />
                                
                                
                                <xsl:for-each select="//n1:Invoice/cbc:Note">
                                    <xsl:if test=".">
                                        <b>      Not:</b>
                                        <xsl:value-of select="." />
                                        <br />
                                    </xsl:if>
                                </xsl:for-each>
                                <xsl:if test="//n1:Invoice/cac:PaymentMeans/cbc:InstructionNote">
                                    <b>      Ödeme
                                        Notu: </b>
                                    <xsl:value-of select="//n1:Invoice/cac:PaymentMeans/cbc:InstructionNote" />
                                    <br />
                                </xsl:if>
                                <xsl:if test="//n1:Invoice/cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:PaymentNote">
                                    <b>      Hesap
                                        Açiklamasi: </b>
                                    <xsl:value-of select="//n1:Invoice/cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:PaymentNote" />
                                    <br />
                                </xsl:if>
                                <xsl:if test="//n1:Invoice/cac:PaymentTerms/cbc:Note">
                                    <b>      Ödeme
                                        Kosulu: </b>
                                    <xsl:value-of select="//n1:Invoice/cac:PaymentTerms/cbc:Note" />
                                    <br />
                                </xsl:if>
                                <br />
                                <table id="budgetContainerTable2" width="799" border="1">
                                    <tbody>
                                    </tbody>
                                    <tbody>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </body>
        </html>
    </xsl:template>
    <xsl:template match="dateFormatter">
        <xsl:value-of select="substring(.,9,2)" />-
        <xsl:value-of select="substring(.,6,2)" />-
        <xsl:value-of select="substring(.,1,4)" />
    </xsl:template>
    <xsl:template name="dovizi_oku">
        <xsl:param name="doviz" />
        <xsl:variable name="okunacak" select="." />
        <xsl:variable name="noktadan_sonra" select="round(($okunacak - floor($okunacak)) * 100)" />
        <xsl:call-template name="sayi_oku">
            <xsl:with-param name="okunacak" select="." />
        </xsl:call-template>
        <xsl:if test="$doviz">
            <xsl:choose>
                <xsl:when test="$doviz =  'TRL' or $doviz =  'TRY'">
                    <xsl:value-of select="' Türk Lirası'" />
                    <xsl:if test="$noktadan_sonra &gt; 0">
                        <xsl:value-of select="' '" />
                        <xsl:call-template name="sayi_oku">
                            <xsl:with-param name="okunacak" select="$noktadan_sonra" />
                        </xsl:call-template>
                        <xsl:value-of select="' Kuruş'" />
                    </xsl:if>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:text></xsl:text>
                    <xsl:value-of select="$doviz" />
                    <xsl:if test="$noktadan_sonra &gt; 0">
                        <xsl:value-of select="' '" />
                        <xsl:call-template name="sayi_oku">
                            <xsl:with-param name="okunacak" select="$noktadan_sonra" />
                        </xsl:call-template>
                        <xsl:value-of select="' Cent'" />
                    </xsl:if>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:if>
    </xsl:template>
    <xsl:template name="sayi_oku">
        <xsl:param name="okunacak" />
        <xsl:variable name="tam_sayi" select="floor($okunacak)" />
        <xsl:variable name="birler" select="floor($okunacak) mod 10" />
        <xsl:variable name="onlar" select="floor(floor($tam_sayi mod 100) div 10)" />
        <xsl:variable name="yuzler" select="floor(floor($tam_sayi mod 1000) div 100)" />
        <xsl:variable name="binler" select="floor(floor($tam_sayi mod 1000000) div 1000)" />
        <xsl:variable name="milyonlar" select="floor(floor($tam_sayi mod 1000000000) div 1000000)" />
        <xsl:variable name="milyarlar" select="floor(floor($tam_sayi mod 1000000000000) div 1000000000)" />
        <xsl:if test="$milyarlar &gt; 0">
            <xsl:call-template name="sayi_oku_3hane">
                <xsl:with-param name="sayi" select="$milyarlar" />
            </xsl:call-template> Milyar
        
        </xsl:if>
        <xsl:if test="$milyonlar &gt; 0">
            <xsl:call-template name="sayi_oku_3hane">
                <xsl:with-param name="sayi" select="$milyonlar" />
            </xsl:call-template> Milyon
        
        </xsl:if>
        <xsl:if test="$binler &gt; 0">
            <xsl:if test="$binler = 1">Bin </xsl:if>
            <xsl:if test="$binler &gt; 1">
                <xsl:call-template name="sayi_oku_3hane">
                    <xsl:with-param name="sayi" select="$binler" />
                </xsl:call-template> Bin
            
            </xsl:if>
        </xsl:if>
        <xsl:call-template name="yuzler_oku">
            <xsl:with-param name="sayi" select="$yuzler" />
        </xsl:call-template>
        <xsl:call-template name="onlar_oku">
            <xsl:with-param name="sayi" select="$onlar" />
        </xsl:call-template>
        <xsl:call-template name="birler_oku">
            <xsl:with-param name="sayi" select="$birler" />
        </xsl:call-template>
    </xsl:template>
    <xsl:template name="sayi_oku_3hane">
        <xsl:param name="sayi" />
        <xsl:variable name="tam_sayi" select="floor($sayi)" />
        <xsl:variable name="birler" select="floor($sayi) mod 10" />
        <xsl:variable name="onlar" select="floor(floor($tam_sayi mod 100) div 10)" />
        <xsl:variable name="yuzler" select="floor(floor($tam_sayi mod 1000) div 100)" />
        <xsl:call-template name="yuzler_oku">
            <xsl:with-param name="sayi" select="$yuzler" />
        </xsl:call-template>
        <xsl:call-template name="onlar_oku">
            <xsl:with-param name="sayi" select="$onlar" />
        </xsl:call-template>
        <xsl:call-template name="birler_oku">
            <xsl:with-param name="sayi" select="$birler" />
        </xsl:call-template>
    </xsl:template>
    <xsl:template name="birler_oku">
        <xsl:param name="sayi" />
        <xsl:choose>
            <xsl:when test="$sayi =  1">Bir </xsl:when>
            <xsl:when test="$sayi =  2">İki </xsl:when>
            <xsl:when test="$sayi =  3">Üç </xsl:when>
            <xsl:when test="$sayi =  4">Dört </xsl:when>
            <xsl:when test="$sayi =  5">Beş </xsl:when>
            <xsl:when test="$sayi =  6">Altı </xsl:when>
            <xsl:when test="$sayi =  7">Yedi </xsl:when>
            <xsl:when test="$sayi =  8">Sekiz </xsl:when>
            <xsl:when test="$sayi =  9">Dokuz </xsl:when>
            <xsl:otherwise></xsl:otherwise>
        </xsl:choose>
    </xsl:template>
    <xsl:template name="onlar_oku">
        <xsl:param name="sayi" />
        <xsl:choose>
            <xsl:when test="$sayi =  1">On </xsl:when>
            <xsl:when test="$sayi =  2">Yirmi </xsl:when>
            <xsl:when test="$sayi =  3">Otuz </xsl:when>
            <xsl:when test="$sayi =  4">Kırk </xsl:when>
            <xsl:when test="$sayi =  5">Elli </xsl:when>
            <xsl:when test="$sayi =  6">Altmış </xsl:when>
            <xsl:when test="$sayi =  7">Yetmiş </xsl:when>
            <xsl:when test="$sayi =  8">Seksen </xsl:when>
            <xsl:when test="$sayi =  9">Doksan </xsl:when>
            <xsl:otherwise />
        </xsl:choose>
    </xsl:template>
    <xsl:template name="yuzler_oku">
        <xsl:param name="sayi" />
        <xsl:choose>
            <xsl:when test="$sayi =  1">Yüz </xsl:when>
            <xsl:when test="$sayi =  2">İki Yüz </xsl:when>
            <xsl:when test="$sayi =  3">Üç Yüz </xsl:when>
            <xsl:when test="$sayi =  4">Dört Yüz </xsl:when>
            <xsl:when test="$sayi =  5">Beş Yüz </xsl:when>
            <xsl:when test="$sayi =  6">Altı Yüz </xsl:when>
            <xsl:when test="$sayi =  7">Yedi Yüz </xsl:when>
            <xsl:when test="$sayi =  8">Sekiz Yüz </xsl:when>
            <xsl:when test="$sayi =  9">Dokuz Yüz </xsl:when>
            <xsl:otherwise />
        </xsl:choose>
    </xsl:template>
    <xsl:template name="binler_oku">
        <xsl:param name="sayi" />
        <xsl:choose>
            <xsl:when test="$sayi =  1">Bin </xsl:when>
            <xsl:when test="$sayi =  2">İki Bin </xsl:when>
            <xsl:when test="$sayi =  3">Üç Bin </xsl:when>
            <xsl:when test="$sayi =  4">Dört Bin </xsl:when>
            <xsl:when test="$sayi =  5">Beş Bin </xsl:when>
            <xsl:when test="$sayi =  6">Altı Bin </xsl:when>
            <xsl:when test="$sayi =  7">Yedi Bin </xsl:when>
            <xsl:when test="$sayi =  8">Sekiz Bin </xsl:when>
            <xsl:when test="$sayi =  9">Dokuz Bin </xsl:when>
            <xsl:otherwise />
        </xsl:choose>
    </xsl:template>
    <xsl:template name="onbinler_oku">
        <xsl:param name="sayi" />
        <xsl:if test="$sayi &gt; 0">
            <xsl:call-template name="onlar_oku">
                <xsl:with-param name="sayi" select="$sayi" />
            </xsl:call-template>Bin
        
        </xsl:if>
    </xsl:template>
    <xsl:template name="parcala">
        <xsl:param name="csv" />
        <xsl:param name="isaret" />
        <xsl:variable name="first-item" select="normalize-space(substring-before( concat( $csv, '|'), '|'))" />
        <xsl:if test="$csv">
            <xsl:if test="normalize-space(substring-after(concat($first-item, ''), $isaret))">
                <xsl:value-of disable-output-escaping="yes" select="normalize-space(substring-after(concat($first-item, ''), $isaret))" />
            </xsl:if>
            <xsl:call-template name="parcala">
                <xsl:with-param name="csv" select="substring-after($csv,'|')" />
                <xsl:with-param name="isaret" select="$isaret" />
            </xsl:call-template>
        </xsl:if>
    </xsl:template>
    <xsl:template match="//n1:Invoice/cac:InvoiceLine">
        <tr id="lineTableTr">
            <td id="lineTableTd">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:value-of select="./cbc:ID" />
                </span>
            </td>
            <td id="lineTableTd">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:value-of select="./cac:Item/cbc:Name" />
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:value-of select="format-number(./cbc:InvoicedQuantity, '###.###,#####', 'european')" />
                    <xsl:if test="./cbc:InvoicedQuantity/@unitCode">
                        <xsl:for-each select="./cbc:InvoicedQuantity">
                            <xsl:text></xsl:text>
                            <xsl:choose>
                                <xsl:when test="@unitCode  = '26'">
                                    <span>
                                        <xsl:text>Ton</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'BX'">
                                    <span>
                                        <xsl:text>Kutu</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'LTR'">
                                    <span>
                                        <xsl:text>LT</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'NIU'">
                                    <span>
                                        <xsl:text>Adet</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'C62'">
                                    <span>
                                        <xsl:text>Adet</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'KGM'">
                                    <span>
                                        <xsl:text>KG</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'KJO'">
                                    <span>
                                        <xsl:text>kJ</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'GRM'">
                                    <span>
                                        <xsl:text>G</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MGM'">
                                    <span>
                                        <xsl:text>MG</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'NT'">
                                    <span>
                                        <xsl:text>Net Ton</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'GT'">
                                    <span>
                                        <xsl:text>GT</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MTR'">
                                    <span>
                                        <xsl:text>M</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MMT'">
                                    <span>
                                        <xsl:text>MM</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'KTM'">
                                    <span>
                                        <xsl:text>KM</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MLT'">
                                    <span>
                                        <xsl:text>ML</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MMQ'">
                                    <span>
                                        <xsl:text>MM3</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'CLT'">
                                    <span>
                                        <xsl:text>CL</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'CMK'">
                                    <span>
                                        <xsl:text>CM2</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'CMQ'">
                                    <span>
                                        <xsl:text>CM3</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'CMT'">
                                    <span>
                                        <xsl:text>CM</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MTK'">
                                    <span>
                                        <xsl:text>M2</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MTQ'">
                                    <span>
                                        <xsl:text>M3</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'DAY'">
                                    <span>
                                        <xsl:text> Gün</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'MON'">
                                    <span>
                                        <xsl:text> Ay</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'PK'">
                                    <span>
                                        <xsl:text> Paket</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'KWH'">
                                    <span>
                                        <xsl:text> KWH</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'ANN'">
                                    <span>
                                        <xsl:text>Yıl</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'HUR'">
                                    <span>
                                        <xsl:text>Saat</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'D61'">
                                    <span>
                                        <xsl:text>Dakika</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'D62'">
                                    <span>
                                        <xsl:text>Saniye</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'TN'">
                                    <span>
                                        <xsl:text>Teneke</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'PR'">
                                    <span>
                                        <xsl:text>Çift</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'RO'">
                                    <span>
                                        <xsl:text>Rulo</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'PA'">
                                    <span>
                                        <xsl:text>Takım</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'LN'">
                                    <span>
                                        <xsl:text>Boy</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'BDN'">
                                    <span>
                                        <xsl:text>Bidon</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'G/M'">
                                    <span>
                                        <xsl:text>Galon/mil</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'KL'">
                                    <span>
                                        <xsl:text>Koli</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'KSY'">
                                    <span>
                                        <xsl:text>Kişi sayısı</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'PST'">
                                    <span>
                                        <xsl:text>Poşet</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'TR'">
                                    <span>
                                        <xsl:text>Tambur</xsl:text>
                                    </span>
                                </xsl:when>
                            </xsl:choose>
                        </xsl:for-each>
                    </xsl:if>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:value-of select="format-number(./cac:Price/cbc:PriceAmount, '###.##0,00####', 'european')" />
                    <xsl:call-template name="CurrencyInfo">
                        <xsl:with-param name="cid" select="./cac:Price/cbc:PriceAmount/@currencyID" />
                    </xsl:call-template>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:if test="./cac:AllowanceCharge/cbc:MultiplierFactorNumeric">
                        <xsl:text> %</xsl:text>
                        <xsl:value-of select="format-number(./cac:AllowanceCharge/cbc:MultiplierFactorNumeric * 100, '###.##0,##' , 'european')" />
                    </xsl:if>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:if test="./cac:AllowanceCharge">
                        <xsl:value-of select="format-number(./cac:AllowanceCharge/cbc:Amount, '###.##0,00', 'european')" />
                    </xsl:if>
                    <xsl:call-template name="CurrencyInfo">
                        <xsl:with-param name="cid" select="./cac:AllowanceCharge/cbc:Amount/@currencyID" />
                    </xsl:call-template>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:for-each select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="cbc:TaxTypeCode='0015' ">
                            <xsl:text></xsl:text>
                            <xsl:if test="../../cbc:Percent">
                                <xsl:text> %</xsl:text>
                                <xsl:value-of select="format-number(../../cbc:Percent, '###.##0,00', 'european')" />
                            </xsl:if>
                        </xsl:if>
                    </xsl:for-each>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:for-each select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="cbc:TaxTypeCode='0015' ">
                            <xsl:text></xsl:text>
                            <xsl:value-of select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')" />
                            <xsl:call-template name="CurrencyInfo">
                                <xsl:with-param name="cid" select="../../cbc:TaxAmount/@currencyID" />
                            </xsl:call-template>
                        </xsl:if>
                    </xsl:for-each>
                </span>
            </td>
            <td id="lineTableTd" style="font-size: xx-small" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:for-each select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="cbc:TaxTypeCode!='0015' ">
                            <xsl:text></xsl:text>
                            <xsl:value-of select="cbc:Name" />
                            <xsl:if test="../../cbc:Percent">
                                <xsl:text> (%</xsl:text>
                                <xsl:value-of select="format-number(../../cbc:Percent, '###.##0,00', 'european')" />
                                <xsl:text>)=</xsl:text>
                            </xsl:if>
                            <xsl:value-of select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')" />
                            <xsl:call-template name="CurrencyInfo">
                                <xsl:with-param name="cid" select="../../cbc:TaxAmount/@currencyID" />
                            </xsl:call-template>
                        </xsl:if>
                    </xsl:for-each>
                    <xsl:for-each select="./cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="../../cbc:Percent">
                            <xsl:text>KDV TEVKİFAT (%</xsl:text>
                            <xsl:value-of select="format-number(../../cbc:Percent, '###.##0,00', 'european')" />
                            <xsl:text>)=</xsl:text>
                        </xsl:if>
                        <xsl:value-of select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')" />
                        <xsl:call-template name="CurrencyInfo">
                            <xsl:with-param name="cid" select="../../cbc:TaxAmount/@currencyID" />
                        </xsl:call-template>
                    </xsl:for-each>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text></xsl:text>
                    <xsl:value-of select="format-number(./cbc:LineExtensionAmount, '###.##0,00', 'european')" />
                    <xsl:call-template name="CurrencyInfo">
                        <xsl:with-param name="cid" select="./cbc:LineExtensionAmount/@currencyID" />
                    </xsl:call-template>
                </span>
            </td>
        </tr>
    </xsl:template>
    <xsl:template name="CurrencyInfo">
        <xsl:param name="cid" />
        <xsl:if test="$cid">
            <xsl:text></xsl:text>
            <xsl:choose>
                <xsl:when test="$cid = 'TRL'">
                    <xsl:text>TL</xsl:text>
                </xsl:when>
                <xsl:when test="$cid ='TRY'">
                    <xsl:text>TL</xsl:text>
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="$cid" />
                </xsl:otherwise>
            </xsl:choose>
        </xsl:if>
    </xsl:template>
    <xsl:template name="ShowEmployeesInTeam">
    <xsl:param name="lstInvoiceQ" />
    <xsl:if test="sum($lstInvoiceQ) !=0">
      <xsl:value-of select="sum($lstInvoiceQ)" />
      <xsl:text> </xsl:text>
      <xsl:if test="$lstInvoiceQ[1]/@unitCode">
        <xsl:choose>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = '26'">
            <span>
              <xsl:text>Ton</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'BX'">
            <span>
              <xsl:text>Kutu</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'LTR'">
            <span>
              <xsl:text>LT</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'NIU'">
            <span>
              <xsl:text>Adet</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'C62'">
            <span>
              <xsl:text>Adet</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'KGM'">
            <span>
              <xsl:text>KG</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'KJO'">
            <span>
              <xsl:text>kJ</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'GRM'">
            <span>
              <xsl:text>G</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MGM'">
            <span>
              <xsl:text>MG</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'NT'">
            <span>
              <xsl:text>Net Ton</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'GT'">
            <span>
              <xsl:text>GT</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MTR'">
            <span>
              <xsl:text>M</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MMT'">
            <span>
              <xsl:text>MM</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'KTM'">
            <span>
              <xsl:text>KM</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MLT'">
            <span>
              <xsl:text>ML</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MMQ'">
            <span>
              <xsl:text>MM3</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'CLT'">
            <span>
              <xsl:text>CL</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'CMK'">
            <span>
              <xsl:text>CM2</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'CMQ'">
            <span>
              <xsl:text>CM3</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'CMT'">
            <span>
              <xsl:text>CM</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MTK'">
            <span>
              <xsl:text>M2</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MTQ'">
            <span>
              <xsl:text>M3</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'DAY'">
            <span>
              <xsl:text> Gün</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'MON'">
            <span>
              <xsl:text> Ay</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'PA'">
            <span>
              <xsl:text> Paket</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'PR'">
            <span>
              <xsl:text> Çift</xsl:text>
            </span>
          </xsl:when>
          <xsl:when test="$lstInvoiceQ[1]/@unitCode  = 'KWH'">
            <span>
              <xsl:text> KWH</xsl:text>
            </span>
          </xsl:when>
        </xsl:choose>
      </xsl:if>
      <xsl:if test="position() !=last()">
        <xsl:text> + </xsl:text>
      </xsl:if>
    </xsl:if>
  </xsl:template>
    <xsl:variable name="QRSOVOS">
<xsl:text>https://qr.sovostr.com/qr?data=</xsl:text>
        <xsl:text>{"vkntckn":"</xsl:text>       
        <xsl:value-of select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification/cbc:ID[@schemeID = 'VKN' or @schemeID = 'TCKN']"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"avkntckn":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID[@schemeID = 'VKN' or @schemeID = 'TCKN']"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"senaryo":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cbc:ProfileID"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"tip":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cbc:InvoiceTypeCode"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"tarih":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cbc:IssueDate"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"no":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cbc:ID"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"ettn":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cbc:UUID"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"parabirimi":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cbc:DocumentCurrencyCode"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"malhizmettoplam":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount"/>
        <xsl:text>",</xsl:text>
        <xsl:for-each select="//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode='0015']">
            <xsl:text>"kdvmatrah(</xsl:text>
            <xsl:value-of select="format-number(cbc:Percent,'#','european')"/>
            <xsl:text>)":"</xsl:text>
            <xsl:value-of select="format-number(cbc:TaxableAmount, '###.##0,00', 'european')"/>
            <xsl:text>",</xsl:text>
            <xsl:text>"hesaplanankdv(</xsl:text>
            <xsl:value-of select="format-number(cbc:Percent,'#','european')"/>
            <xsl:text>)":"</xsl:text>
            <xsl:value-of select="format-number(cbc:TaxAmount, '###.##0,00', 'european')"/>
            <xsl:text>",</xsl:text>
        </xsl:for-each>
        <xsl:text>"vergidahil":"</xsl:text>
        <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount, '###.##0,00', 'european')"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"odenecek":"</xsl:text>
        <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount, '###.##0,00', 'european')"/>
        <xsl:text>"}</xsl:text>
</xsl:variable>
</xsl:stylesheet>