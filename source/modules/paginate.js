'use strict';

const self = {

  //
  // Generates pagination data.
  //
  //  totalItems* (int) - The total number of items in the collection.
  //  itemsPerPage* (int) - The number of items per page.
  //  currentPage (int) - The current page (default 1).
  //  urlCallback (function) - A callback function accepting a page argument that generates a URL.
  //
  get: (totalItems, itemsPerPage, currentPage, urlCallback) => {
    totalItems = parseInt(totalItems);
    itemsPerPage = parseInt(itemsPerPage) || 1;
    currentPage = parseInt(currentPage) || 1;

    let totalPages = Math.ceil(totalItems / itemsPerPage);
    let prevPage = currentPage > 1 ? currentPage - 1 : null;
    let nextPage = currentPage < totalPages ? currentPage + 1 : null;
    let prevPageUrl = urlCallback && prevPage ? urlCallback(prevPage) : null;
    let nextPageUrl = urlCallback && nextPage ? urlCallback(nextPage) : null;

    return {
      totalItems,
      itemsPerPage,
      currentPage,
      totalPages,
      nextPage,
      nextPageUrl,
      prevPage,
      prevPageUrl
    };
  }

};

module.exports = self;
