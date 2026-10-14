export const conditionOptions = [
  { value: 'new', label: 'Brand New' }, { value: 'like-new', label: 'Like New' }, { value: 'good', label: 'Good' }, { value: 'fair', label: 'Fair' }
]
export const complaintTypes = [
  { value: 'not-delivered', label: 'Item not delivered' }, { value: 'wrong-item', label: 'Wrong item received' },
  { value: 'damaged', label: 'Item damaged' }, { value: 'not-as-described', label: 'Not as described' }, { value: 'other', label: 'Other' }
]
export const ORDER_STATUS = {
  pending_payment: { label: 'Awaiting payment', tone: 'gray' }, paid: { label: 'Paid · in escrow', tone: 'solid' }, shipped: { label: 'On the way', tone: 'info' },
  delivered: { label: 'Delivered', tone: 'info' }, confirmed: { label: 'Completed', tone: '' }, disputed: { label: 'In dispute', tone: 'danger' },
  refunded: { label: 'Refunded', tone: 'gray' }, cancelled: { label: 'Cancelled', tone: 'gray' }
}
export const badgeClass = (tone) => (tone ? `badge badge--${tone}` : 'badge')
export const deliveryLocations = ['Hostel A', 'Hostel B', 'Hostel C', 'Faculty of Science', 'Faculty of Arts', 'Main Gate', 'Library', 'Student Centre']
