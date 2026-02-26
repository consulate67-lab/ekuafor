<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    exclude-result-prefixes="cac cbc ccts clm54217 clm5639 clm66411 clmIANAMIMEMediaType fn link n1 qdt udt xbrldi xbrli xdt xlink xs xsd xsi"
    xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
    xmlns:ccts="urn:un:unece:uncefact:documentation:2"
    xmlns:clm54217="urn:un:unece:uncefact:codelist:specification:54217:2001"
    xmlns:clm5639="urn:un:unece:uncefact:codelist:specification:5639:1988"
    xmlns:clm66411="urn:un:unece:uncefact:codelist:specification:66411:2001"
    xmlns:clmIANAMIMEMediaType="urn:un:unece:uncefact:codelist:specification:IANAMIMEMediaType:2003"
    xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:link="http://www.xbrl.org/2003/linkbase"
    xmlns:n1="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
    xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
    xmlns:udt="urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2"
    xmlns:xbrldi="http://xbrl.org/2006/xbrldi" xmlns:xbrli="http://www.xbrl.org/2003/instance"
    xmlns:xdt="http://www.w3.org/2005/xpath-datatypes" xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2" xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xmlns:xades="http://uri.etsi.org/01903/v1.3.2#">
    <xsl:decimal-format name="european" decimal-separator="," grouping-separator="." NaN=""/>
    <xsl:output version="4.0" method="html" indent="no" encoding="UTF-8"
        doctype-public="-//W3C//DTD HTML 4.01 Transitional//EN"
        doctype-system="http://www.w3.org/TR/html4/loose.dtd"/>
    <xsl:param name="SV_OutputFormat" select="'HTML'"/>
    <xsl:variable name="XML" select="/"/>
    <xsl:template match="/">
        <html>
            <head>


      
        
                <title/>
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
                        border-spacing: 0px;
                        border-style: inset;
                        border-color: black;
                        border-collapse: collapse;
                        background-color:
                    }
                    #notesTableTd {
                        border-width: 0px;
                        border-spacing: 0px;
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
                <title>e-Arşiv Fatura</title>
            </head>
            <body
                style="margin-left=0.6in; margin-right=0.6in; margin-top=0.79in; margin-bottom=0.79in">
                <xsl:for-each select="$XML">
                    <table align="center" style="border-color:blue; " border="0" cellspacing="0px" width="900"
                        cellpadding="0px">
                        <tbody>
                            <tr valign="top">
                                <td width="40%">
                                    <br/>
                                    <table align="center" border="0" width="100%">
                                        <tbody>
                                            <hr/>
                                            <tr align="left">
                                                <xsl:for-each select="n1:Invoice">
                                                <xsl:for-each select="cac:AccountingSupplierParty">
                                                <xsl:for-each select="cac:Party">
                                                <td align="left">
                                                <xsl:if test="cac:PartyName">
                                                <xsl:value-of select="cac:PartyName/cbc:Name"/>
                                                <br/>
                                                </xsl:if>
                                                <xsl:for-each select="cac:Person">
                                                <xsl:for-each select="cbc:Title">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:FirstName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:MiddleName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:FamilyName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:NameSuffix">
                                                <xsl:apply-templates/>
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
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:District">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:BuildingName">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                <xsl:if test="cbc:BuildingNumber">
                                                <span>
                                                <xsl:text> No:</xsl:text>
                                                </span>
                                                <xsl:for-each select="cbc:BuildingNumber">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:if>
                                                <br/>
                                                <xsl:for-each select="cbc:PostalZone">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:CitySubdivisionName">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                <span>
                                                <xsl:text>/ </xsl:text>
                                                </span>
                                                <xsl:for-each select="cbc:CityName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </td>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                            </tr>
                                            <xsl:if
                                                test="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telephone or //n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:Telefax">
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
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                </xsl:if>
                                                <xsl:if test="cbc:Telefax">
                                                <span>
                                                <xsl:text> Fax: </xsl:text>
                                                </span>
                                                <xsl:for-each select="cbc:Telefax">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                </xsl:if>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                </td>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </tr>
                                            </xsl:if>
                                            <xsl:for-each
                                                select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cbc:WebsiteURI">
                                                <tr align="left">
                                                <td>
                                                <xsl:text>Web Sitesi: </xsl:text>
                                                <xsl:value-of select="."/>
                                                </td>
                                                </tr>
                                            </xsl:for-each>
                                            <xsl:for-each
                                                select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:Contact/cbc:ElectronicMail">
                                                <tr align="left">
                                                <td>
                                                <xsl:text>E-Posta: </xsl:text>
                                                <xsl:value-of select="."/>
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
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                <span>
                                                <xsl:text>&#160; </xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                </td>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                            </tr>
                                            <xsl:for-each
                                                select="//n1:Invoice/cac:AccountingSupplierParty/cac:Party/cac:PartyIdentification">
                                                <tr align="left">
                                                <td>
                                                <xsl:value-of select="cbc:ID/@schemeID"/>
                                                <xsl:text>: </xsl:text>
                                                <xsl:value-of select="cbc:ID"/>
                                                </td>
                                                </tr>
                                            </xsl:for-each>
                                        </tbody>
                                    </table>
                                    <hr/>
                                </td>
                                <td width="20%" align="center" valign="middle">
                                    <br/>
                                    <br/>
                                    <img style="width:91px;" align="middle" alt="E-Fatura Logo"
                                        src="data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABkAAD/4QMZaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/PiA8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIiB4OnhtcHRrPSJBZG9iZSBYTVAgQ29yZSA1LjYtYzEzMiA3OS4xNTkyODQsIDIwMTYvMDQvMTktMTM6MTM6NDAgICAgICAgICI+IDxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+IDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PSIiIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bXBNTTpEb2N1bWVudElEPSJ4bXAuZGlkOjZDNDJBNEI2QjVCRDExRThCQjM0REIwQkZGMEQxODY0IiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOjZDNDJBNEI1QjVCRDExRThCQjM0REIwQkZGMEQxODY0IiB4bXA6Q3JlYXRvclRvb2w9IkFkb2JlIFBob3Rvc2hvcCBDUzQgV2luZG93cyI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSIzREVENkU1N0FDREVDNEJBNzkxNUM2M0NCN0RENzM0NyIgc3RSZWY6ZG9jdW1lbnRJRD0iM0RFRDZFNTdBQ0RFQzRCQTc5MTVDNjNDQjdERDczNDciLz4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+IDw/eHBhY2tldCBlbmQ9InIiPz7/7gAOQWRvYmUAZMAAAAAB/9sAhAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEB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"/>

                                    <h1 align="center">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>e-Arşiv Fatura</xsl:text>
                                        </span>
                                    </h1>
                                </td>
               <td align="right" valign="right" width="20%">
                                 <img src="{$QRSOVOS}" alt="qrcode" width="175px" />
                             <xsl:text>
                         </xsl:text>
                                <img alt="universal Logo" style="width:200px;   margin-top:30px; margin-left: 30px; margin-right: 0px;margin-bottom: 0px;" src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAEGATIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACisvX9FGvaYbI6jf2GXDedYTeVJx2zg8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Kqj3Jr5z+Knxo/t6CfQPDTOmnvlLi8I2tcD+6o6hT3PU+w693cfBWTXp1n8WeL9W1Vgc+Wm2JFPsDuA/ACuv8O/Dfwn4X2Pp2jwfaF6XEw82XPrubp+GKAPnTwR8F/EPit4rq9jbS9LJyZp0xJIP9hDz+JwPrX054Z8LaT4R0ePTNIthFCvLMeXkbuzHuf8AIrZooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//Z"></img>
                                </td>

                            </tr>

                           
                            
                            <tr style="height:118px; " valign="top">
                                <td width="40%" align="right" valign="bottom">
                                    <table id="customerPartyTable" align="left" border="0"
                                        height="50%">
                                        <tbody>
                                            <tr style="height:71px; ">
                                                <td>
                                                <hr/>
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
                                                <xsl:if test="cac:PartyName">
                                                <xsl:value-of select="cac:PartyName/cbc:Name"/>
                                                <br/>
                                                </xsl:if>
                                                <xsl:for-each select="cac:Person">
                                                <xsl:for-each select="cbc:Title">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:FirstName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:MiddleName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160; </xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:FamilyName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:NameSuffix">
                                                <xsl:apply-templates/>
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
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:District">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:BuildingName">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:BuildingNumber">
                                                <span>
                                                <xsl:text> No:</xsl:text>
                                                </span>
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <br/>
                                                <xsl:for-each select="cbc:Room">
                                                <span>
                                                <xsl:text>Kapi No:</xsl:text>
                                                </span>
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <br/>
                                                <xsl:for-each select="cbc:PostalZone">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:CitySubdivisionName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>/ </xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:CityName">
                                                <xsl:apply-templates/>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </td>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </tr>
                                                <xsl:for-each
                                                select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cbc:WebsiteURI">
                                                <tr align="left">
                                                <td>
                                                <xsl:text>Web Sitesi: </xsl:text>
                                                <xsl:value-of select="."/>
                                                </td>
                                                </tr>
                                                </xsl:for-each>
                                                <xsl:for-each
                                                select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:Contact/cbc:ElectronicMail">
                                                <tr align="left">
                                                <td>
                                                <xsl:text>E-Posta: </xsl:text>
                                                <xsl:value-of select="."/>
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
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                <xsl:for-each select="cbc:Telefax">
                                                <span>
                                                <xsl:text> Fax: </xsl:text>
                                                </span>
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </td>
                                                </tr>
                                                </xsl:if>
                                                <xsl:if
                                                test="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name">
                                                <tr align="left">
                                                <td>
                                                <span>
                                                <xsl:text>Vergi Dairesi: </xsl:text>
                                                <xsl:value-of
                                                select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyTaxScheme/cac:TaxScheme/cbc:Name"
                                                />
                                                </span>
                                                </td>
                                                </tr>
                                                </xsl:if>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                <xsl:for-each
                                                select="//n1:Invoice/cac:AccountingCustomerParty/cac:Party/cac:PartyIdentification">
                                                <tr align="left">
                                                <td>
                                                <xsl:value-of select="cbc:ID/@schemeID"/>
                                                <xsl:text>: </xsl:text>
                                                <xsl:value-of select="cbc:ID"/>
                                                </td>
                                                </tr>
                                                </xsl:for-each>
                                                </tbody>
                                                </table>
                                                <hr/>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <br/>
                                </td>
                                <td width="1%"/>
<td width="59%" align="center" valign="bottom" colspan="2">
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
                                                <xsl:apply-templates/>
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
                                                <xsl:apply-templates/>
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
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                <span style="font-weight:bold; ">
                          <xsl:text>Belge No:</xsl:text>
                                                </span>
                                                </td>
                                                <td align="left">
                                                <xsl:for-each select="n1:Invoice">
                                                <xsl:for-each select="cbc:ID">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </td>
                                            </tr>
                                            <tr style="height:13px; ">
                                                <td align="left">
                                                <span style="font-weight:bold; ">
                                                <xsl:text>Düzenleme Tarihi:</xsl:text>
                                                </span>
                                                </td>
                                                <td align="left">
                                                <xsl:for-each select="n1:Invoice">
                                                <xsl:for-each select="cbc:IssueDate">
                                                <xsl:value-of select="substring(.,9,2)"
                                                />-<xsl:value-of select="substring(.,6,2)"
                                                />-<xsl:value-of select="substring(.,1,4)"/>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </td>
                                            </tr>
                      <tr style="height:13px; ">
                        <td align="left">
                          <span style="font-weight:bold; ">
                            <xsl:text>Düzenleme Zamanı:</xsl:text>
                          </span>
                        </td>
                        <td align="left">                          
                            <xsl:value-of select="substring(n1:Invoice/cbc:IssueTime,1,8)"/>                            
                        </td>
                      </tr>
                                            <xsl:for-each
                                                select="n1:Invoice/cac:DespatchDocumentReference">
                                                <tr style="height:13px; ">
                                                <td align="left">
                                                <span style="font-weight:bold; ">
                                                <xsl:text>Irsaliye No:</xsl:text>
                                                </span>
                                                <span>
                                                <xsl:text>&#160;</xsl:text>
                                                </span>
                                                </td>
                                                <td align="left">
                                                <xsl:value-of select="cbc:ID"/>
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
                                                <xsl:value-of select="substring(.,9,2)"
                                                />-<xsl:value-of select="substring(.,6,2)"
                                                />-<xsl:value-of select="substring(.,1,4)"/>
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
                                                <xsl:for-each
                                                select="n1:Invoice/cac:OrderReference">
                                                <xsl:for-each select="cbc:ID">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                                </xsl:for-each>
                                                </td>
                                                </tr>
                                            </xsl:if>
                                            <xsl:if
                                                test="//n1:Invoice/cac:OrderReference/cbc:IssueDate">
                                                <tr style="height:13px">
                                                <td align="left">
                                                <span style="font-weight:bold; ">
                                                <xsl:text>Siparis Tarihi:</xsl:text>
                                                </span>
                                                </td>
                                                <td align="left">
                                                <xsl:for-each
                                                select="n1:Invoice/cac:OrderReference">
                                                <xsl:for-each select="cbc:IssueDate">
                                                <xsl:value-of select="substring(.,9,2)"
                                                />-<xsl:value-of select="substring(.,6,2)"
                                                />-<xsl:value-of select="substring(.,1,4)"/>
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
                                <table width="900" align="center" id="ettnTable">
                                    <tr style="height:13px;">
                                        <td width="7px" align="left" valign="top">
                                            <span style="font-weight:bold; ">
                                                <xsl:text>ETTN:</xsl:text>
                                            </span>
                                        </td>
                                        <td align="left" width="240px">
                                            <xsl:for-each select="n1:Invoice">
                                                <xsl:for-each select="cbc:UUID">
                                                <xsl:apply-templates/>
                                                </xsl:for-each>
                                            </xsl:for-each>
                                        </td>
                                        <td>&#160;</td>
                                    </tr>
                                </table>
                            </tr>
                        </tbody>
                    </table>
                    <div id="lineTableAligner">
                        <span>
                            <xsl:text>&#160;</xsl:text>
                        </span>
                    </div>
                    <table align="center" border="1" id="lineTable" width="900">
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
                                <xsl:if test="//n1:Invoice/cbc:ProfileID='EARSIVFATURA'">
                                    <xsl:if test="//n1:Invoice/cbc:InvoiceTypeCode='HKSSATIS' or //n1:Invoice/cbc:InvoiceTypeCode='HKSKOMISYONCU'">
                                        <td class="lineTableTd" style="width:5%" align="center">
                                            <span style="font-weight:bold;">
                                                <xsl:text>Künye Numarası</xsl:text>
                                            </span>
                                        </td>
                                    </xsl:if>
                                </xsl:if>
                                <xsl:if test="//n1:Invoice/cbc:ProfileID='EARSIVFATURA'">
                                    <xsl:if test="//n1:Invoice/cbc:InvoiceTypeCode='HKSSATIS'">
                                        <td class="lineTableTd" style="width:5%" align="center">
                                            <span style="font-weight:bold;">
                                                <xsl:text>Mal Sahibi VKN/TCKN</xsl:text>
                                            </span>
                                        </td>
                                        <td class="lineTableTd" style="width:5%" align="center">
                                            <span style="font-weight:bold;">
                                                <xsl:text>Mal Sahibi Ad/Soyad</xsl:text>
                                            </span>
                                        </td>
                                    </xsl:if>
                                </xsl:if>
                            </tr>
                                                                
                                        <xsl:apply-templates            select="//n1:Invoice/cac:InvoiceLine"/>
                                
                        </tbody>
                    </table>
                </xsl:for-each>
                <br/>
                <table align="center" id="budgetContainerTable" border="0" width="900px">
                <tr>
                <td align="left" width="300px" valign="top">        
                <table border="0">
                <xsl:if test="//n1:Invoice/cbc:ProfileID='EARSIVFATURA'">
            <xsl:if test="//n1:Invoice/cbc:InvoiceTypeCode='HKSSATIS' or //n1:Invoice/cbc:InvoiceTypeCode='HKSKOMISYONCU'">
                <td align="left" valign="top" width="300px">
                    <table border="2">
                    <tbody>
                    
                        <xsl:for-each select="n1:Invoice/cac:AllowanceCharge">
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSKOMISYON'">
                                <text><b>Masraflar</b></text>
                                <tr align="left">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Komisyon - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSKOMISYONKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Komisyon KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSNAVLUN'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Navlun - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSNAVLUNKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Navlun KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSHAMMALIYE'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Hammaliye - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSHAMMALIYEKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Hammaliye KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSNAKLIYE'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Nakliye - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSNAKLIYEKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Nakliye KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSGVTEVKIFAT'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>G.V. Tevkifat - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSBAGKURTEVKIFAT'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Bağkur Tevkifat - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSRUSUM'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Rüsum - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSRUSUMKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Rüsum KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSTICBORSASI'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Ticaret Borsası - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSTICBORSASIKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Ticaret Borsası KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSMILLISAVUNMAFON'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Milli Savunma Fon - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSMSFONKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Milli Savunma Fon KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSDIGERMASRAFLAR'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Diğer Masraflar - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                            <xsl:if test="cbc:AllowanceChargeReason = 'HKSDIGERKDV'">
                                <tr align="right">
                                    <td class="lineTableBudgetTd"
                                        align="right"
                                        width="200px">
                                        <span style="font-weight:bold; ">
                                            <xsl:text>Diğer KDV - %</xsl:text>
                                        </span>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:Amount">
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                    <td class="lineTableBudgetTd"
                                        style="width:81px; "
                                        align="right">
                                        <xsl:for-each select="cbc:MultiplierFactorNumeric">
                                            <xsl:text> %</xsl:text>
                                            <xsl:call-template name="Curr_Type"/>
                                        </xsl:for-each>
                                    </td>
                                </tr>
                            </xsl:if>
                        </xsl:for-each>
                    </tbody>
                </table>
                </td>
            </xsl:if>
        </xsl:if>
        </table>
    
    </td>
                <td align="right" valign="top">
                <table>
                <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" align="right" width="300px">
                            <span style="font-weight:bold; ">
                                <xsl:text>Mal Hizmet Toplam Tutari</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:81px; " align="right">
                            <span>
                                <xsl:value-of
                                    select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount, '###.##0,00', 'european')"/>
                                <xsl:if
                                    test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID">
                                    <xsl:text> </xsl:text>
                                    <xsl:if
                                        test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID = 'TRY' ">
                                        <xsl:text>TL</xsl:text>
                                    </xsl:if>
                                    <xsl:if
                                        test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID != 'TRY'">
                                        <xsl:value-of
                                            select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID"
                                        />
                                    </xsl:if>
                                </xsl:if>
                            </span>
                        </td>
                    </tr>
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" align="right" width="300px">
                            <span style="font-weight:bold; ">
                                <xsl:text>Toplam Iskonto</xsl:text>
                                <xsl:if test="//n1:Invoice/cac:AllowanceCharge/cbc:MultiplierFactorNumeric">
                                <xsl:text>&#160;</xsl:text>
                                <xsl:text>(%</xsl:text>
                                <xsl:value-of
                                select="//n1:Invoice/cac:AllowanceCharge/cbc:MultiplierFactorNumeric * 100"
                                />
                                <xsl:text>)</xsl:text>
                                </xsl:if>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:81px; " align="right">
                            <span>
                                <xsl:value-of
                                    select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount, '###.##0,00', 'european')"/>
                                <xsl:if
                                    test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID">
                                    <xsl:text> </xsl:text>
                                    <xsl:if
                                        test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID = 'TRY'">
                                        <xsl:text>TL</xsl:text>
                                    </xsl:if>
                                    <xsl:if
                                        test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID != 'TRY' ">
                                        <xsl:value-of
                                            select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:AllowanceTotalAmount/@currencyID"
                                        />
                                    </xsl:if>
                                </xsl:if>
                            </span>
                        </td>
                    </tr>
                    <xsl:for-each select="n1:Invoice/cac:TaxTotal/cac:TaxSubtotal">

            <xsl:if test="cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015'">

              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" width="300px" align="right">
                  <span style="font-weight:bold; ">
                    <xsl:text>KDV Matrahı </xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                 
                    <xsl:text> </xsl:text>
                    
                                                         
                        <xsl:value-of
                          select="format-number(cbc:TaxableAmount, '###.##0,00', 'european')"/>
                        <xsl:if
                          test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID">
                          <xsl:text> </xsl:text>
                          <xsl:if
                            test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID = 'TRY'">
                            <xsl:text>TL</xsl:text>
                          </xsl:if>
                          <xsl:if
                            test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID != 'TRY'">
                            <xsl:value-of
                              select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount/@currencyID"
                                        />
                          </xsl:if>


   
                    </xsl:if>                 
                  
               
                  
                </td>
              </tr>

              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" width="300px" align="right">
                  <span style="font-weight:bold; ">
                    <xsl:text>Hesaplanan </xsl:text>
                    <xsl:value-of select="cac:TaxCategory/cac:TaxScheme/cbc:Name"/>
                    <xsl:text>(%</xsl:text>
                    <xsl:value-of select="cbc:Percent"/>
                    <xsl:text>)</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                  <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                    <xsl:text> </xsl:text>
                    <xsl:value-of
                      select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')"/>
                    <xsl:if test="../../cbc:TaxAmount/@currencyID">
                      <xsl:text> </xsl:text>
                      <xsl:if test="../../cbc:TaxAmount/@currencyID = 'TRL' or ../../cbc:TaxAmount/@currencyID = 'TRY'">
                        <xsl:text>TL</xsl:text>
                      </xsl:if>
                      <xsl:if test="../../cbc:TaxAmount/@currencyID != 'TRL' and ../../cbc:TaxAmount/@currencyID != 'TRY'">
                        <xsl:value-of select="../../cbc:TaxAmount/@currencyID"/>
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
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" width="300px" align="right">
                  <span style="font-weight:bold; ">
                    <xsl:text>Hesaplanan </xsl:text>
                    <xsl:value-of select="cac:TaxCategory/cac:TaxScheme/cbc:Name"/>
                    <xsl:text>(%</xsl:text>
                    <xsl:value-of select="cbc:Percent"/>
                    <xsl:text>)</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                  <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                    <xsl:text> </xsl:text>
                    <xsl:value-of
                      select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')"/>
                    <xsl:if test="../../cbc:TaxAmount/@currencyID">
                      <xsl:text> </xsl:text>
                      <xsl:if test="../../cbc:TaxAmount/@currencyID = 'TRL' or ../../cbc:TaxAmount/@currencyID = 'TRY'">
                        <xsl:text>TL</xsl:text>
                      </xsl:if>
                      <xsl:if test="../../cbc:TaxAmount/@currencyID != 'TRL' and ../../cbc:TaxAmount/@currencyID != 'TRY'">
                        <xsl:value-of select="../../cbc:TaxAmount/@currencyID"/>
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
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" align="right" width="200px">
                  <span style="font-weight:bold; ">
                    <xsl:text>KDV Matrahı</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:81px; " align="right">
                  <xsl:value-of
                                            select="format-number(sum(//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=0015]/cbc:TaxableAmount), '###.##0,00', 'european')"/>
                  <xsl:if
                                        test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID">
                    <xsl:text> </xsl:text>
                    <xsl:if
                                            test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRY'">
                      <xsl:text>TL</xsl:text>
                    </xsl:if>
                    <xsl:if
                                            test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRY'">
                      <xsl:value-of
                                                select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID"
                                            />
                    </xsl:if>
                  </xsl:if>
                </td>
              </tr>
              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" align="right" width="300px">
                  <span style="font-weight:bold; ">
                    <xsl:text>Tevkifat Dahil Toplam Tutar</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:81px; " align="right">



                  <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount, '###.##0,00', 'european')"/>


                  <xsl:call-template name="CurrencyInfo">
                    <xsl:with-param name="cid" select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID"/>
                  </xsl:call-template>


                </td>
              </tr>
              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" align="right" width="300px">
                  <span style="font-weight:bold; ">
                    <xsl:text>Tevkifat Hariç Toplam Tutar</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:81px; " align="right">

                  <xsl:value-of select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount, '###.##0,00', 'european')"/>


                  <xsl:call-template name="CurrencyInfo">
                    <xsl:with-param name="cid" select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID"/>
                  </xsl:call-template>

                </td>
              </tr>
            </xsl:if>
          </xsl:for-each>

          <xsl:if test="n1:Invoice/cac:WithholdingTaxTotal">
            <xsl:for-each select="n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal">

              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" width="300px" align="right">
                  <span style="font-weight:bold; ">
                    <xsl:text>Hesaplanan KDV Tevkifat</xsl:text>
                    <xsl:text>(%</xsl:text>
                    <xsl:value-of select="cbc:Percent"/>
                    <xsl:text>)</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                  <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                    <xsl:text> </xsl:text>
                    <xsl:value-of
                      select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')"/>
                    <xsl:if test="../../cbc:TaxAmount/@currencyID">
                      <xsl:text> </xsl:text>
                      <xsl:if test="../../cbc:TaxAmount/@currencyID = 'TRL' or  ../../cbc:TaxableAmount/@currencyID = 'TRY'">
                        <xsl:text>TL</xsl:text>
                      </xsl:if>
                      <xsl:if test="../../cbc:TaxAmount/@currencyID != 'TRL' and  ../../cbc:TaxableAmount/@currencyID != 'TRY'">
                        <xsl:value-of select="../../cbc:TaxAmount/@currencyID"/>
                      </xsl:if>
                    </xsl:if>
                  </xsl:for-each>
                </td>
              </tr>


            </xsl:for-each>
          </xsl:if>

          <xsl:if
                      test="sum(n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:TaxableAmount)>0">
            <tr id="budgetContainerTr" align="right">
              <td id="budgetContainerDummyTd"/>
              <td id="lineTableBudgetTd" width="300px" align="right">
                <span style="font-weight:bold; ">
                  <xsl:text>Tevkifata Tabi İşlem Tutarı</xsl:text>
                </span>
              </td>
              <td id="lineTableBudgetTd" style="width:82px; " align="right">
                <xsl:value-of
                                    select="format-number(sum(n1:Invoice/cac:InvoiceLine[cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:LineExtensionAmount), '###.##0,00', 'european')"/>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                  <xsl:text>TL</xsl:text>
                </xsl:if>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                  <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode"/>
                </xsl:if>
              </td>
            </tr>
            <tr id="budgetContainerTr" align="right">
              <td id="budgetContainerDummyTd"/>
              <td id="lineTableBudgetTd" width="300px" align="right">
                <span style="font-weight:bold; ">
                  <xsl:text>Tevkifata Tabi İşlem Üzerinden Hes. KDV</xsl:text>
                </span>
              </td>
              <td id="lineTableBudgetTd" style="width:82px; " align="right">
                <xsl:value-of
                                    select="format-number(sum(n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:TaxableAmount), '###.##0,00', 'european')"/>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                  <xsl:text>TL</xsl:text>
                </xsl:if>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                  <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode"/>
                </xsl:if>
              </td>
            </tr>
          </xsl:if>
          <xsl:if test = "n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]">
            <tr id="budgetContainerTr" align="right">
              <td id="budgetContainerDummyTd"/>
              <td id="lineTableBudgetTd" width="300px" align="right">
                <span style="font-weight:bold; ">
                  <xsl:text>Tevkifata Tabi İşlem Tutarı</xsl:text>
                </span>
              </td>
              <td id="lineTableBudgetTd" style="width:82px; " align="right">
                <xsl:if test = "n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]">
                  <xsl:value-of
                                        select="format-number(sum(n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]/cbc:LineExtensionAmount), '###.##0,00', 'european')"/>
                </xsl:if>
                <xsl:if test = "//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=&apos;9015&apos;">
                  <xsl:value-of
                                        select="format-number(sum(n1:Invoice/cac:InvoiceLine[cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:LineExtensionAmount), '###.##0,00', 'european')"/>
                </xsl:if>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                  <xsl:text> TL</xsl:text>
                </xsl:if>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                  <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode"/>
                </xsl:if>
              </td>
            </tr>
            <tr id="budgetContainerTr" align="right">
              <td id="budgetContainerDummyTd"/>
              <td id="lineTableBudgetTd" width="300px" align="right">
                <span style="font-weight:bold; ">
                  <xsl:text>Tevkifata Tabi İşlem Üzerinden Hes. KDV</xsl:text>
                </span>
              </td>
              <td id="lineTableBudgetTd" style="width:82px; " align="right">
                <xsl:if test = "n1:Invoice/cac:InvoiceLine[cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme]">
                  <xsl:value-of
                                        select="format-number(sum(n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme]/cbc:TaxableAmount), '###.##0,00', 'european')"/>
                </xsl:if>
                <xsl:if test = "//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=&apos;9015&apos;">
                  <xsl:value-of
                                        select="format-number(sum(n1:Invoice/cac:TaxTotal/cac:TaxSubtotal[cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode=9015]/cbc:TaxableAmount), '###.##0,00', 'european')"/>
                </xsl:if>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode = 'TRL' or n1:Invoice/cbc:DocumentCurrencyCode = 'TRY'">
                  <xsl:text> TL</xsl:text>
                </xsl:if>
                <xsl:if test="n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                  <xsl:value-of select="n1:Invoice/cbc:DocumentCurrencyCode"/>
                </xsl:if>
              </td>
            </tr>
          </xsl:if>
          
          
                    
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Vergiler Dahil Toplam Tutar</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                                <xsl:for-each select="cac:LegalMonetaryTotal">
                                    <xsl:for-each select="cbc:TaxInclusiveAmount">
                                        <xsl:value-of
                                            select="format-number(., '###.##0,00', 'european')"/>
                                        <xsl:if
                                            test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID">
                                            <xsl:text> </xsl:text>
                                            <xsl:if
                                                test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if
                                                test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID != 'TRY'">
                                                <xsl:value-of
                                                select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount/@currencyID"
                                                />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
<!-- YENİ ALANLAR -->
                    <xsl:if test="//n1:Invoice/cbc:ProfileID='EARSIVFATURA' and //n1:Invoice/cbc:InvoiceTypeCode='HKSKOMISYONCU'">
                        <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                    <xsl:text>Toplam Masraflar</xsl:text>
                                </span>
                            </td>
                            <td id="lineTableBudgetTd"
                                style="width:82px; "
                                align="right">
                                <xsl:for-each select="n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount">
                                    <xsl:value-of select="format-number(., '###.##0,00', 'european')"/>
                                    <xsl:if test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount/@currencyID">
                                            <xsl:text> </xsl:text>
                                            <xsl:if
                                                test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if
                                                test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount/@currencyID != 'TRY'">
                                                <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:ChargeTotalAmount/@currencyID"/>
                                            </xsl:if>
                                        </xsl:if>
                                </xsl:for-each>
                            </td>
                        </tr>
                    </xsl:if>
                    <!-- YENİ ALANLAR -->
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Ödenecek Tutar</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                                <xsl:for-each select="cac:LegalMonetaryTotal">
                                    <xsl:for-each select="cbc:PayableAmount">
                                        <xsl:value-of
                                            select="format-number(., '###.##0,00', 'european')"/>
                                        <xsl:if
                                            test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID">
                                            <xsl:text> </xsl:text>
                                            <xsl:if
                                                test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID = 'TRL' or //n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID = 'TRY'">
                                                <xsl:text>TL</xsl:text>
                                            </xsl:if>
                                            <xsl:if
                                                test="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID != 'TRL' and //n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID != 'TRY'">
                                                <xsl:value-of
                                                select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount/@currencyID"
                                                />
                                            </xsl:if>
                                        </xsl:if>
                                    </xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
                    
                    
                    <xsl:if test="//n1:Invoice/cbc:DocumentCurrencyCode != 'TRL' and //n1:Invoice/cbc:DocumentCurrencyCode != 'TRY'">
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Döviz Kuru</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                                <xsl:for-each select="cac:PricingExchangeRate">
                                    <xsl:for-each select="cbc:CalculationRate">
                                        <xsl:value-of
                                            select="."/>
                                        
                                    </xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Mal Hizmet Toplam Tutarı(TL)</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <span>
                                <xsl:value-of
                                    select="format-number(//n1:Invoice/cac:LegalMonetaryTotal/cbc:LineExtensionAmount * //n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate, '###.##0,00', 'european')"/>
                                <xsl:text> TL</xsl:text
                            ></span>
                        </td>
                    </tr>
                    
                    
                    <xsl:for-each select="n1:Invoice/cac:TaxTotal/cac:TaxSubtotal">

            <xsl:if test="cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode = '0015'">

              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" width="300px" align="right">
                  <span style="font-weight:bold; ">
                    <xsl:text>KDV Matrahı(TL) </xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                <xsl:variable name="myRate" select="//n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate"/>
                  <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                    <xsl:text> </xsl:text>
                    <xsl:value-of
                      select="format-number(../../cbc:TaxableAmount *$myRate, '###.##0,00', 'european')"/>
                    TL
                  </xsl:for-each>
                </td>
              </tr>

              <tr id="budgetContainerTr" align="right">
                <td id="budgetContainerDummyTd"/>
                <td id="lineTableBudgetTd" width="300px" align="right">
                  <span style="font-weight:bold; ">
                    <xsl:text>Hesaplanan </xsl:text>
                    <xsl:value-of select="cac:TaxCategory/cac:TaxScheme/cbc:Name"/>
                    <xsl:text>(%</xsl:text>
                    <xsl:value-of select="cbc:Percent"/>
                    <xsl:text>) (TL)</xsl:text>
                  </span>
                </td>
                <td id="lineTableBudgetTd" style="width:82px; " align="right">
                 <xsl:variable name="myRate" select="//n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate"/>
                
                  <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                    <xsl:text> </xsl:text>
                    <xsl:value-of
                      select="format-number(../../cbc:TaxAmount * $myRate, '###.##0,00', 'european')"/>
                   TL
                  </xsl:for-each>
                </td>
              </tr>
            </xsl:if>

          </xsl:for-each>
          
          
          <xsl:for-each select="n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal">
             
                <tr id="budgetContainerTr" align="right">
                  <td id="budgetContainerDummyTd"/>
                  <td id="lineTableBudgetTd" width="300px" align="right">
                    <span style="font-weight:bold; ">
                      <xsl:text>Hesaplanan KDV Tevkifat</xsl:text>
                      <xsl:text>(%</xsl:text>
                      <xsl:value-of select="cbc:Percent"/>
                      <xsl:text>) (TL)</xsl:text>
                    </span>
                  </td>
                  <td id="lineTableBudgetTd" style="width:82px; " align="right">
                   <xsl:variable name="myRate" select="//n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate"/>
                
                    <xsl:for-each select="cac:TaxCategory/cac:TaxScheme">
                      <xsl:text> </xsl:text>
                      <xsl:value-of
                        select="format-number(../../cbc:TaxAmount * $myRate, '###.##0,00', 'european')"/>
                      TL
                    </xsl:for-each>
                  </td>
                </tr>
          

            </xsl:for-each>
                    
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Vergiler Dahil Toplam Tutar(TL)</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                            <xsl:variable name="myRate" select="//n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate"/>
                                <xsl:for-each select="cac:LegalMonetaryTotal">
                                    <xsl:for-each select="cbc:TaxInclusiveAmount">
                                        <xsl:value-of
                                            select="format-number(. * $myRate, '###.##0,00', 'european')"/>
                                            <xsl:text> TL</xsl:text
                                    ></xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
                    <tr id="budgetContainerTr" align="right">
                        <td id="budgetContainerDummyTd"/>
                        <td id="lineTableBudgetTd" width="300px" align="right">
                            <span style="font-weight:bold; ">
                                <xsl:text>Ödenecek Tutar(TL)</xsl:text>
                            </span>
                        </td>
                        <td id="lineTableBudgetTd" style="width:82px; " align="right">
                            <xsl:for-each select="n1:Invoice">
                            <xsl:variable name="myRate" select="//n1:Invoice/cac:PricingExchangeRate/cbc:CalculationRate"/>
                                <xsl:for-each select="cac:LegalMonetaryTotal">
                                    <xsl:for-each select="cbc:PayableAmount">
                                        <xsl:value-of
                                            select="format-number(. * $myRate, '###.##0,00', 'european')"/>
                                            <xsl:text> TL</xsl:text
                                    ></xsl:for-each>
                                </xsl:for-each>
                            </xsl:for-each>
                        </td>
                    </tr>
                    </xsl:if> </table></td>
                </tr>
                </table>
                <br/>
                <table id="notesTable" width="900px" align="center" height="100">
                    <tbody>
                        <tr align="left">
                            <td id="notesTableTd">


                <xsl:for-each select="//n1:Invoice/cac:InvoiceLine">
                  <xsl:if test="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason">
                    <xsl:if test="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason  != ''">
                      <b>&#160;&#160;&#160;&#160;&#160;<xsl:value-of select="cbc:ID"/>. Kalem Vergi İstisna Muafiyet Sebebi:"</b>
                      <xsl:value-of select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason"/>
                      <br/>
                    </xsl:if>
                  </xsl:if>
                </xsl:for-each>
                
                
                                <xsl:if test="//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason != ''">
                                <xsl:if test="//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason">
                                    <b>&#160;&#160;&#160;&#160;&#160; Vergi İstisna Muafiyet Sebebi:</b>
                                    <xsl:value-of select="//n1:Invoice/cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReason"/>
                                    <br/>
                                </xsl:if>   
</xsl:if>

                <xsl:for-each select="//n1:Invoice/cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                  <b>&#160;&#160;&#160;&#160;&#160; Tevkifat Sebebi: </b>
                  <xsl:value-of select="cbc:TaxTypeCode"/>
                  <xsl:text>-</xsl:text>
                  <xsl:value-of select="cbc:Name"/>
                  <br/>
                </xsl:for-each>
                
                
 <xsl:for-each select="//n1:Invoice/cbc:Note">

                  <xsl:if test=".">
                    <b>&#160;&#160;&#160;&#160;&#160;  </b>
                    <xsl:value-of select="."/>
                    <br/>
                  </xsl:if>

                </xsl:for-each>
                                <xsl:if test="//n1:Invoice/cac:PaymentMeans/cbc:InstructionNote">
                                    <b>&#160;&#160;&#160;&#160;&#160; Ödeme
                                        Notu: </b>
                                    <xsl:value-of
                                        select="//n1:Invoice/cac:PaymentMeans/cbc:InstructionNote"/>
                                    <br/>
                                </xsl:if>
                                <xsl:if
                                    test="//n1:Invoice/cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:PaymentNote">
                                    <b>&#160;&#160;&#160;&#160;&#160; Hesap
                                        Açiklamasi: </b>
                                    <xsl:value-of
                                        select="//n1:Invoice/cac:PaymentMeans/cac:PayeeFinancialAccount/cbc:PaymentNote"/>
                                    <br/>
                                </xsl:if>
                                <xsl:if test="//n1:Invoice/cac:PaymentTerms/cbc:Note">
                                    <b>&#160;&#160;&#160;&#160;&#160; Ödeme
                                        Kosulu: </b>
                                    <xsl:value-of select="//n1:Invoice/cac:PaymentTerms/cbc:Note"/>
                                    <br/>
                                </xsl:if>

                 <xsl:for-each select="//n1:Invoice/cac:AdditionalDocumentReference">
                  <xsl:choose>
                    <xsl:when test="cbc:DocumentTypeCode = 'SendingType'">

                      <xsl:if test="cbc:DocumentType = 'ELEKTRONIK'">
                        <br/>
                        <b>&#160;&#160;&#160;&#160;&#160; E-Arşiv İzni Kapsamında Elektronik Olarak iletilmiştir.</b>

                      </xsl:if>
                      <xsl:if test="cbc:DocumentType = 'KAGIT'">
                        <br/>
                        <b>&#160;&#160;&#160;&#160;&#160; İrsaliye yerine geçer.</b>

                      </xsl:if>

                    </xsl:when>

                  </xsl:choose>

                </xsl:for-each>

                            </td>
                        </tr>
                    </tbody>
                                        <tr>
    <td>
        <b>&#160;&#160;&#160;&#160;&#160; *Bu belge Digital Planet tarafından oluşturulmuştur.</b>
    </td>
</tr>
                </table>
                
            </body>
        </html>
    </xsl:template>
    <xsl:template match="dateFormatter">
        <xsl:value-of select="substring(.,9,2)"/>-<xsl:value-of select="substring(.,6,2)"
            />-<xsl:value-of select="substring(.,1,4)"/>
    </xsl:template>
    <xsl:template match="//n1:Invoice/cac:InvoiceLine">
        <tr id="lineTableTr">
            <td id="lineTableTd">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of select="./cbc:ID"/>
                </span>
            </td>
            <td id="lineTableTd">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of select="./cac:Item/cbc:Name"/>
                    <!--    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of select="./cac:Item/cbc:BrandName"/>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of select="./cac:Item/cbc:ModelName"/>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of select="./cac:Item/cbc:Description"/>-->
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of
                        select="format-number(./cbc:InvoicedQuantity, '###.##0,#####', 'european')"/>
                    <xsl:if test="./cbc:InvoicedQuantity/@unitCode">
                        <xsl:for-each select="./cbc:InvoicedQuantity">
                            <xsl:text> </xsl:text>
                            <xsl:choose>
                                <xsl:when test="@unitCode  = '26'">
                                    <span>
                                        <xsl:text>Ton</xsl:text>
                                    </span>
                                </xsl:when>
                                <xsl:when test="@unitCode  = 'TNE'">
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
                <xsl:when test="@unitCode  = 'SET'">
                                    <span>
                                        <xsl:text>Set</xsl:text>
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
                <xsl:when test="@unitCode  = 'NPL'">
                  <span>
                    <xsl:text>Koli</xsl:text>
                  </span>
                </xsl:when>
                <xsl:when test="@unitCode  = 'KSY'">
                  <span>
                    <xsl:text>Kişi sayısı</xsl:text>
                  </span>
                </xsl:when>
                <xsl:when test="@unitCode  = 'PŞT'">
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
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of
                        select="format-number(./cac:Price/cbc:PriceAmount, '###.##0,00####', 'european')"/>
          
          <xsl:call-template name="CurrencyInfo">
            <xsl:with-param name="cid" select="./cac:Price/cbc:PriceAmount/@currencyID"/>
          </xsl:call-template>
          
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:if test="./cac:AllowanceCharge/cbc:MultiplierFactorNumeric">
                        <xsl:text> %</xsl:text>
                        <xsl:value-of
                            select="format-number(./cac:AllowanceCharge/cbc:MultiplierFactorNumeric * 100, '###.##0,##', 'european')"
                        />
                    </xsl:if>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:if test="./cac:AllowanceCharge">
                        <!--<xsl:if test="./cac:AllowanceCharge/cbc:ChargeIndicator = true() ">+
                                        </xsl:if>
                        <xsl:if test="./cac:AllowanceCharge/cbc:ChargeIndicator = false() ">-
                                        </xsl:if>-->
                        
                        <xsl:value-of
                            select="format-number(./cac:AllowanceCharge/cbc:Amount, '###.##0,00', 'european')"
                        />
                    </xsl:if>
          
          <xsl:call-template name="CurrencyInfo">
            <xsl:with-param name="cid" select="./cac:AllowanceCharge/cbc:Amount/@currencyID"/>
          </xsl:call-template>
          
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:for-each
                        select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="cbc:TaxTypeCode='0015' ">
                            <xsl:text> </xsl:text>
                            <xsl:if test="../../cbc:Percent">
                                <xsl:text> %</xsl:text>
                                <xsl:value-of
                                    select="format-number(../../cbc:Percent, '###.##0,00', 'european')"
                                />
                            </xsl:if>
                        </xsl:if>
                    </xsl:for-each>
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:for-each
                        select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="cbc:TaxTypeCode='0015' ">
                            <xsl:text> </xsl:text>
                            <xsl:value-of
                                select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')"/>

              <xsl:call-template name="CurrencyInfo">
                <xsl:with-param name="cid" select="../../cbc:TaxAmount/@currencyID"/>
              </xsl:call-template>
              
                        </xsl:if>
                    </xsl:for-each>
                </span>
            </td>
            <td id="lineTableTd" style="font-size: xx-small" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:for-each
                        select="./cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
                        <xsl:if test="cbc:TaxTypeCode!='0015' ">
                            <xsl:text> </xsl:text>
                            <xsl:value-of select="cbc:Name"/>
                                <xsl:if test="../../cbc:Percent">
                                    <xsl:text> (%</xsl:text>
                                    <xsl:value-of
                                        select="format-number(../../cbc:Percent, '###.##0,00', 'european')"
                                    />
                                    <xsl:text>)=</xsl:text>
                                </xsl:if>
                            <xsl:value-of
                                select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')"/>
              <xsl:call-template name="CurrencyInfo">
                <xsl:with-param name="cid" select="../../cbc:TaxAmount/@currencyID"/>
              </xsl:call-template>

                        </xsl:if>

            
                    </xsl:for-each>




          <xsl:for-each
         select="./cac:WithholdingTaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme">
            <xsl:text> Tevkifat</xsl:text>

            <xsl:if test="../../cbc:Percent">
              <xsl:text> (%</xsl:text>
              <xsl:value-of
                select="format-number(../../cbc:Percent, '###.##0,00', 'european')"
                                    />
              <xsl:text>)=</xsl:text>
            </xsl:if>
            <xsl:value-of
              select="format-number(../../cbc:TaxAmount, '###.##0,00', 'european')"/>
            <xsl:call-template name="CurrencyInfo">
              <xsl:with-param name="cid" select="../../cbc:TaxAmount/@currencyID"/>
            </xsl:call-template>




          </xsl:for-each>
          
          
          
                </span>
            </td>
            <td id="lineTableTd" align="right">
                <span>
                    <xsl:text>&#160;</xsl:text>
                    <xsl:value-of
                        select="format-number(./cbc:LineExtensionAmount, '###.##0,00', 'european')"/>

          <xsl:call-template name="CurrencyInfo">
            <xsl:with-param name="cid" select="./cbc:LineExtensionAmount/@currencyID"/>
          </xsl:call-template>

        </span>
            </td>
            <xsl:if test="//n1:Invoice/cbc:ProfileID='EARSIVFATURA'">
<xsl:if test="//n1:Invoice/cbc:InvoiceTypeCode='HKSSATIS' or //n1:Invoice/cbc:InvoiceTypeCode='HKSKOMISYONCU'">
<td class="lineTableTd" align="right">
<xsl:text> </xsl:text>
<xsl:for-each
select="cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='KUNYENO']">

<xsl:text> </xsl:text>
<xsl:apply-templates/>

</xsl:for-each>
</td>
</xsl:if></xsl:if>
<xsl:if test="//n1:Invoice/cbc:ProfileID='EARSIVFATURA'">
<xsl:if test="//n1:Invoice/cbc:InvoiceTypeCode='HKSSATIS'">
<td class="lineTableTd" align="right">

<xsl:text> </xsl:text>
<xsl:for-each
select="cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='MALSAHIBIVKNTCKN']">

<xsl:text> </xsl:text>
<xsl:apply-templates/>
</xsl:for-each>

</td>
<td class="lineTableTd" align="right">

<xsl:text> </xsl:text>
<xsl:for-each
select="cac:Item/cac:AdditionalItemIdentification/cbc:ID[@schemeID='MALSAHIBIADSOYADUNVAN']">

<xsl:text> </xsl:text>
<xsl:apply-templates/>
</xsl:for-each>
</td>
</xsl:if></xsl:if>
        </tr>
    
    </xsl:template>
  
  <xsl:template name ="CurrencyInfo">
    <xsl:param name="cid"/>
    <xsl:if test="$cid">
      <xsl:text>&#160;</xsl:text>
      <xsl:if test="$cid = 'TRL' or $cid = 'TRY' ">
        <xsl:text>TL</xsl:text>
      </xsl:if>
      <xsl:if test="$cid != 'TRL' and $cid != 'TRY' ">
        <xsl:value-of select="$cid"/>
      </xsl:if>
    </xsl:if>
  </xsl:template>
  <xsl:template name="Curr_Type">
        <xsl:value-of select="format-number(., '###.##0,00', 'european')"/>     
        <xsl:if test="@currencyID">
            <xsl:text> </xsl:text>
            <xsl:choose>
                <xsl:when test="@currencyID = 'TRL' or @currencyID = 'TRY'">
                    <xsl:text>TL</xsl:text>                 
                </xsl:when>
                <xsl:otherwise>
                    <xsl:value-of select="@currencyID"/>
                </xsl:otherwise>
            </xsl:choose>
        </xsl:if>       
    </xsl:template>

<!-- 20-08-2023 qr code regülasyonu sovos -->
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
            <xsl:value-of select="cbc:TaxableAmount"/>
            <xsl:text>",</xsl:text>
                <xsl:text>"hesaplanankdv(</xsl:text>
            <xsl:value-of select="format-number(cbc:Percent,'#','european')"/>
            <xsl:text>)":"</xsl:text>
            <xsl:value-of select="cbc:TaxAmount"/>
            <xsl:text>",</xsl:text>
        </xsl:for-each>
        <xsl:text>"vergidahil":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:TaxInclusiveAmount"/>
        <xsl:text>",</xsl:text>
        <xsl:text>"odenecek":"</xsl:text>
        <xsl:value-of select="//n1:Invoice/cac:LegalMonetaryTotal/cbc:PayableAmount"/>
        <xsl:text>"}</xsl:text>
    </xsl:variable>
<!-- 20-08-2023 qr code regülasyonu sovos -->
</xsl:stylesheet>
