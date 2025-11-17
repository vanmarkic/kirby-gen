let counter = 0;

module.exports = {
  nanoid: jest.fn((length = 21) => {
    counter++;
    // For 16 char limit, use a shorter format
    if (length === 16) {
      const id = `m${counter}${Date.now().toString(36)}`;
      if (id.length >= length) {
        return id.slice(0, length);
      }
      return id.padEnd(length, 'x');
    }
    // Generate a unique ID based on counter and timestamp
    const uniqueId = `mock${counter}${Date.now()}`;
    // Pad or truncate to the requested length
    if (uniqueId.length >= length) {
      return uniqueId.slice(0, length);
    }
    return uniqueId.padEnd(length, '0');
  })
};