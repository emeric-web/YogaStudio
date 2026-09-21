describe('Profil — API réelle', () => {
  it('affiche les informations du membre et permet le retour aux séances', () => {
    cy.login();
    cy.contains('Profile').click();
    cy.contains('Emma').should('be.visible');
    cy.contains('user@e2e.test').should('be.visible');
    cy.contains('Member Since').parent().find('p').should('not.be.empty');
    cy.contains('Back to Sessions').click();
    cy.contains('h1', 'Yoga Sessions').should('be.visible');
    cy.contains('Yoga Studio').click();
    cy.location('pathname').should('eq', '/sessions');
  });

  it('annule puis confirme la suppression du compte et refuse une reconnexion', () => {
    cy.login();
    cy.contains('Profile').click();
    cy.on('window:confirm', () => false);
    cy.contains('Delete Account').click();
    cy.contains('My Profile').should('be.visible');
    cy.then(() => { cy.removeAllListeners('window:confirm'); });
    cy.contains('Delete Account').click();
    cy.location('pathname').should('eq', '/login');
    cy.window().then((win) => expect(win.localStorage.getItem('token')).to.be.null);
    cy.get('#email').type('user@e2e.test');
    cy.get('#password').type('test!1234');
    cy.get('button[type=submit]').click();
    cy.contains('Invalid credentials').should('be.visible');
  });

  it('promeut un membre en développement et persiste le rôle administrateur', () => {
    cy.login();
    cy.contains('Profile').click();
    cy.contains('Promote to Admin (Dev)').click();
    cy.contains('Administrator').should('be.visible');
    cy.reload();
    cy.contains('Administrator').should('be.visible');
    cy.contains('Promote to Admin (Dev)').should('not.exist');
    cy.contains('Back to Sessions').click();
    cy.contains('Create Session').click();
    cy.contains('Create New Session').should('be.visible');
  });
});

describe('Profil — erreurs réseau simulées', () => {
  it('affiche une erreur de chargement', () => {
    cy.login();
    cy.intercept('GET', '/api/user/2', { statusCode: 500 });
    cy.contains('Profile').click();
    cy.contains('Failed to load user information').should('be.visible');
  });

  it('conserve la connexion après un échec de suppression', () => {
    cy.login();
    cy.contains('Profile').click();
    cy.intercept('DELETE', '/api/user/2', { statusCode: 500 });
    cy.on('window:alert', cy.stub().as('alert'));
    cy.contains('Delete Account').click();
    cy.get('@alert').should('have.been.calledWith', 'Failed to delete account');
    cy.contains('My Profile').should('be.visible');
    cy.window().then((win) => expect(win.localStorage.getItem('token')).to.be.a('string'));
  });

  it('désactive la promotion en cours, affiche son échec et permet de réessayer', () => {
    cy.login();
    cy.contains('Profile').click();
    cy.intercept({ method: 'POST', url: '/api/user/promote-admin', times: 1 }, {
      statusCode: 500, delay: 500,
    }).as('promote');
    cy.contains('Promote to Admin (Dev)').click();
    cy.contains('Promoting...').should('be.disabled');
    cy.wait('@promote');
    cy.contains('Failed to promote to admin').should('be.visible');
    cy.contains('Promote to Admin (Dev)').click();
    cy.contains('Administrator').should('be.visible');
  });
});
