import type { ProjectDetail } from '../lib/prismaIncludes.js';

import type { ProjectDocument } from './types.js';

/** Converte um projeto já persistido (com relações) para o shape dos documentos. */
export function projectToDocument(project: ProjectDetail): ProjectDocument {
  return {
    number: project.number,
    status: project.status,
    issuingCity: project.issuingCity,
    issueDate: project.issueDate.toISOString(),
    notes: project.notes,
    producer: {
      name: project.producer.name,
      taxId: project.producer.taxId,
      city: project.producer.city,
      state: project.producer.state,
    },
    property: {
      name: project.property.name,
      registrationNumber: project.property.registrationNumber,
      city: project.property.city,
      state: project.property.state,
      totalAreaHectares: project.property.totalAreaHectares.toString(),
    },
    season: { label: project.season.label },
    agronomist: {
      name: project.agronomist.name,
      licenseNumber: project.agronomist.licenseNumber,
      issuingCity: project.agronomist.issuingCity,
    },
    items: project.items.map((item) => ({
      activityName: item.activityName,
      unit: item.unit,
      areaHectares: item.areaHectares.toString(),
      productivity: item.productivity.toString(),
      unitPrice: item.unitPrice.toString(),
      costPerHectare: item.costPerHectare.toString(),
      totalProduction: item.totalProduction.toString(),
      grossRevenue: item.grossRevenue.toString(),
      totalCost: item.totalCost.toString(),
      netProfit: item.netProfit.toString(),
      productivityPerHectare: item.productivityPerHectare?.toString() ?? null,
      stockingRate: item.stockingRate?.toString() ?? null,
    })),
    totalRevenue: project.totalRevenue.toString(),
    totalCost: project.totalCost.toString(),
    totalProfit: project.totalProfit.toString(),
    profitMarginPercentage: project.profitMarginPercentage.toString(),
    approvedCreditLimit: project.approvedCreditLimit?.toString() ?? null,
    bankNotes: project.bankNotes,
    signatures: project.signatures.map((signature) => ({
      type: signature.type,
      signatoryName: signature.signatoryName,
      signatoryDocument: signature.signatoryDocument,
      imageBase64: signature.imageBase64,
      hash: signature.hash,
      signedAt: signature.signedAt ? signature.signedAt.toISOString() : null,
    })),
  };
}
