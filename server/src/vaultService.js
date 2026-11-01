export function vaultSummary(record, id) {
  const username = record.fields.find(field => /^(e[ -]?mail|username|user name|login)$/i.test(field.label.trim()))?.value || 'No username saved';
  // Never return password/custom-field values in the collection response.
  return { id, name: record.name, category: record.category || 'Other', favorite: Boolean(record.favorite), username, createdOn: record.createdOn, updatedOn: record.updatedOn, passwordChangedOn: record.passwordChangedOn };
}
