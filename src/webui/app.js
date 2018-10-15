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
    searchPackages: [],
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

  loadLogo = async () => (
    new Promise( async resolve => {
      const logoUrl = await logo();
      this.setState({ 
        logoUrl 
      }, () => resolve());
     })
  )

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

  loadPackages = async () => (
    new Promise(async (resolve, reject) => {
      try {
        const packages = await API.request('packages', 'GET');
        const transformedPackages = packages.map(({ name, ...others}) => ({
          label: name,
          ...others
        }));
        this.setState({
          packages: transformedPackages,
          filteredPackages: transformedPackages,
        }, () => resolve());
      } catch (error) {
        await this.handleShowAlertDialog({
          title: 'Warning',
          message: `Unable to load package list: ${error.message}`
        });
        reject(new Error(error));
      }
    })
  )

  setLoading = async (isLoading) => (
    new Promise((resolve) => {
      this.setState({
        isLoading
      }, () => resolve());
    })
  )

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
      searchPackages: this.getfilteredPackages(value),
    });
  }

  handlePackagesClearRequested = () => {
    this.setState({
      searchPackages: []
    });
  };

   // eslint-disable-next-line no-unused-vars
   handleSearch = (_, { newValue }) => {
     const { packages } = this.state;
    this.setState({
      search: newValue,
      filteredPackages: newValue ? this.getfilteredPackages(newValue) : packages
    });
  };

  // eslint-disable-next-line no-unused-vars
  handleClickSelPackage = (_, { suggestionValue  }) => {
    this.setState({
      filteredPackages: this.getfilteredPackages(suggestionValue),
      search: suggestionValue
    });
  }

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

  getfilteredPackages = value => {
    const { packages } = this.state;
    const inputValue = deburr(value.trim()).toLowerCase();
    const inputLength = inputValue.length;
    let count = 0;
  
    if (inputLength === 0) {
      return [];
    } else {
      return packages.filter(pkge => {
        const keep = count < 5 && (
          pkge.label && pkge.label.slice(0, inputLength).toLowerCase() === inputValue ||
          pkge.version && pkge.version.slice(0, inputLength).toLowerCase() === inputValue ||
          pkge.keywords && pkge.keywords.some(keyword => keyword.slice(0, inputLength).toLowerCase() === inputValue)
        );

        if (keep) {
          count += 1;
        }

        return keep;
      });
    }
  }
  
  renderAlertDialog = () => (
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
  )

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
    const { isLoading, logoUrl, user, filteredPackages, ...others } = this.state;
    return (
      <div className="page-full-height">
        {this.renderLoginModal()}
        {isLoading ? (
          <Spinner centered />
        ) : (
          <Route
            {...others}
            logo={logoUrl}
            username={user.username}
            toggleLoginModal={this.toggleLoginModal}
            onLogout={this.handleLogout}
            onSearch={this.handleSearch}
            onClick={this.handleClickSelPackage}
            onSuggestionsFetch={this.handleFetchPackages}
            onCleanSuggestions={this.handlePackagesClearRequested}
            packages={filteredPackages}
          />
        )}
        <Footer />
        {this.renderAlertDialog()}
      </div>
    );
  }
}
