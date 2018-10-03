import React, { Component } from 'react';
import isNil from 'lodash/isNil';
import deburr from 'lodash/deburr';
import 'element-theme-default';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import SnackbarContent from '@material-ui/core/SnackbarContent';
import ErrorIcon from '@material-ui/icons/Error';

import storage from './utils/storage';
import logo from './utils/logo';
import { makeLogin, isTokenExpire } from './utils/login';

import Header from './components/Header';
import Footer from './components/Footer';
import Spinner from './components/Spinner';
import LoginModal from './components/Login';
import Route from './router';
import API from './utils/api';

import './styles/main.scss';
import classes from "./app.scss";
import 'normalize.css';

export default class App extends Component {
  state = {
    error: {},
    logoUrl: '',
    user: {},
    scope: (window.VERDACCIO_SCOPE) ? `${window.VERDACCIO_SCOPE}:` : '',
    showLoginModal: false,
    isUserLoggedIn: false,
    packages: [],
    filteredPackages: [],
    search: "",
    isLoading: false,
    showAlertDialog: false,
    alertDialogContent: {
      title: '',
      message: '',
      packages: []
    },
  }

  async componentDidMount() {
    await this.setLoading(true);
    await this.loadLogo();
    await this.isUserAlreadyLoggedIn();
    await this.loadPackages();
    await this.setLoading(false);
  }

  loadLogo = async () => {
   return (
     new Promise( async resolve => {
      const logoUrl = await logo();
      this.setState({ 
        logoUrl 
      }, () => resolve());
     })
   );
  }

  isUserAlreadyLoggedIn = async () => {
    // checks for token validity
    const token = storage.getItem('token');
    const username = storage.getItem('username');

   return (
     new Promise(async resolve => {
      if (isTokenExpire(token) || isNil(username)) {
        await this.handleLogout();
        resolve();
      } else {
        this.setState({
          user: { username, token },
          isUserLoggedIn: true
        }, () => resolve());
      }
     })
   );
  }

  loadPackages = async () => {
    const { search } = this.state;
    return (
      new Promise(async (resolve, reject) => {
        try {
          const packages = await API.request('packages', 'GET');
          const transformedPackages = packages.map(({ name, ...others}) => ({
            label: name,
            ...others
          }));

          if (search === '') {
            this.setState({
              packages: transformedPackages,
              filteredPackages: transformedPackages
            }, () => resolve());
          }
        } catch (error) {
          await this.handleShowAlertDialog({
            title: 'Warning',
            message: `Unable to load package list: ${error.message}`
          });
          reject(new Error(error));
        }
      })
    );
  }

  setLoading = async (isLoading) => {
    return (
      new Promise((resolve) => {
        this.setState({
          isLoading
        }, () => resolve());
      })
    );
  }

  /**
   * Toggles the login modal
   * Required by: <LoginModal /> <Header />
   */
  toggleLoginModal = () => {
    this.setState((prevState) => ({
      showLoginModal: !prevState.showLoginModal,
      error: {}
    }));
  }

  /**
   * handles login
   * Required by: <Header />
   */
  doLogin = async (usernameValue, passwordValue) => {
    const { username, token, error } = await makeLogin(
      usernameValue,
      passwordValue
    );

    if (username && token) {
      this.setState({
        user: {
          username,
          token
        }
      });
      storage.setItem('username', username);
      storage.setItem('token', token);
      // close login modal after successful login
      // set isUserLoggedin to true
      this.setState({
        isUserLoggedIn: true,
        showLoginModal: false
      });
    }

    if (error) {
      this.setState({
        user: {},
        error
      });
    }
  }

  /**
   * Logouts user
   * Required by: <Header />
   */
  handleLogout = async () => (
    new Promise(async resolve => {
      await storage.removeItem('username');
      await storage.removeItem('token');
      this.setState({
        user: {},
        isUserLoggedIn: false
      }, () => resolve());
     })
  )

  handleFetchPackages = ({ value }) => {
    this.setState({
      filteredPackages: this.getfilteredPackages(value),
    });
  }

  handleClearPackages = () => {
    this.setState({
      filteredPackages: this.state.packages
    });
  }

  // eslint-disable-next-line no-unused-vars
  handleSearch = (_, { newValue }) => {
    this.setState({
      search: newValue,
    });
  };

  handleShowAlertDialog = (content) => (
    new Promise((resolve => {
      this.setState({
        showAlertDialog: true,
        alertDialogContent: content
      }, () => resolve());
    }))
  )

  handleDismissAlertDialog = () => {
    this.setState({
      showAlertDialog: false
    });
  };

  getfilteredPackages = (value) => {
    const { packages } = this.state;
    const inputValue = deburr(value.trim()).toLowerCase();
    const inputLength = inputValue.length;
    let count = 0;
  
    return inputLength === 0
      ? []
      : packages.filter(pkge => {
          const keep = count < 5 && (
            pkge.label.slice(0, inputLength).toLowerCase() === inputValue ||
            pkge.version.slice(0, inputLength).toLowerCase() === inputValue ||
            pkge.keywords.some(keyword => keyword.slice(0, inputLength).toLowerCase() === inputValue)
          );
  
          if (keep) {
            count += 1;
          }
  
          return keep;
        });
  }
  

  renderHeader = () => {
    const { logoUrl, filteredPackages, user, ...others } = this.state;
    return (
      <Header
        logo={logoUrl}
        username={user.username}
        toggleLoginModal={this.toggleLoginModal}
        packages={filteredPackages}
        onSearch={this.handleSearch}
        onLogout={this.handleLogout}
        onSuggestionsFetch={this.handleFetchPackages}
        onCleanSuggestions={this.handleClearPackages}
        {...others}
      />
    );
  }

  renderAlertDialog = () => {
    return (
      <Dialog
        open={this.state.showAlertDialog}
        onClose={this.handleDismissAlertDialog}
      >
        <DialogTitle id="alert-dialog-title">
          {this.state.alertDialogContent.title}
        </DialogTitle>
        <DialogContent>
          <SnackbarContent
            className={classes.alertError}
            message={
              <div
                id="client-snackbar"
                className={classes.alertErrorMsg}
              >
                <ErrorIcon className={classes.alertIcon} />
                <span>
                  {this.state.alertDialogContent.message}
                </span>
              </div>
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={this.handleDismissAlertDialog}
            color="primary"
            autoFocus
          >
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  renderLoginModal = () => {
    const { error, showLoginModal } = this.state;
    return (
      <LoginModal
        visibility={showLoginModal}
        error={error}
        onChange={this.setUsernameAndPassword}
        onCancel={this.toggleLoginModal}
        onSubmit={this.doLogin}
      />
    );
  }

  render() {
    const { isUserLoggedIn, isLoading } = this.state;
    return (
      <div className="page-full-height">
        <div id="header">
          {this.renderHeader()}
        </div>
        {this.renderLoginModal()}
        {isLoading ? (
          <Spinner centered />
        ) : (
          <Route isUserLoggedIn={isUserLoggedIn} {...this.state} />
        )}
        <Footer />
        {this.renderAlertDialog()}
      </div>
    );
  }
}
