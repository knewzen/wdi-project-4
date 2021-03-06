import React from 'react';
import Axios from 'axios';
import { Link } from 'react-router-dom';
import Auth from '../../lib/Auth';
import Flash from '../../lib/Flash';
import AggregatedIndexCard from '../homeworks/AggregatedIndexCard';
import _ from 'lodash';

class PupilIndex extends React.Component {
  state = {
    pupils: null
  }

  componentWillMount() {
    console.log('trying to mount');
  }

  getAggregate(pupils) {
    const resultObject = pupils.reduce((result, pupil) => {
      pupil.homeworks.forEach(hw => {
        if (hw.setDate in result) {
          if (!hw.hasBeenSubmitted) {
            result[hw.setDate].haveNotSubmitted.push(`${pupil.firstname} ${pupil.lastname}`);
          }
        } else {
          result[hw.setDate] = {name: hw.name, setDate: hw.setDate, dueDate: hw.dueDate, haveNotSubmitted: []};
          if (!hw.hasBeenSubmitted) {
            result[hw.setDate].haveNotSubmitted.push(`${pupil.firstname} ${pupil.lastname}`);
          }
        }
      });
      return result;
    }, {});
    return Object.values(resultObject);
  }

  listenerFunction = data => {
    if (this.checkForPupilId(data.pupilId)) {
      this.refreshData();
    }
  }

  componentDidMount() {
    this.refreshData();
    console.log('Socket is present: ', !!this.props.socket);
    this.props.socket.on('submitted', this.listenerFunction);
  }

  componentWillUnmount() {
    this.props.socket.removeListener('submitted', this.listenerFunction);
  }

  checkForPupilId = (id) => {
    if (!this.state.pupils) return false;
    return this.state.pupils.find(pupil => pupil.id === id);
  }

  refreshData = () => {
    const payload = Auth.getPayload();
    const headers = Auth.isAuthenticated() ? { authorization: `Bearer ${Auth.getToken()}`} : {};
    Axios
      .get(`/api/teachers/${payload.teacherId}/pupils`, { headers })
      .then(res => {
        const pupils = res.data;
        const aggregateArray = _.orderBy(this.getAggregate(res.data), (hw) => Date.parse(hw.setDate), 'desc');
        this.setState({ pupils, aggregateArray });
      })
      .catch(err => {
        if (err.response.status === 401) {
          Flash.setMessage({ message: 'Access denied', type: 'danger'});
          this.props.history.push('/teachers/login');
        } else {
          console.log(err);
        }
      });
  }

  goToHwByQ = (setDate) => {
    const date = (new Date(setDate)).valueOf();
    this.props.history.push(`/homeworks/${date}/question/1`);
  }

  render() {
    return (
      <main className="container">
        <div className="main-title">
          <h1 className="title is-1 top-space">Your Class</h1>
          <h2 className="title is-4">Pupils</h2>
        </div>
        <div className="pupil-index-list">
          <ul className="names-list">
            {this.state.pupils && this.state.pupils.map(pupil =>
              <li key={pupil.id} className="name">
                <Link to={`/pupils/${pupil.id}`}>
                  {pupil.allSubmitted ? <div className="circle green-circle"></div> : <div className="circle red-circle"></div> }
                  {`${pupil.firstname} ${pupil.lastname}`}
                </Link>
              </li>
            )}
          </ul>
        </div>
        <div className="main-title top-space">
          <h2 className="title is-4">Class Homeworks</h2>
        </div>
        <div className="homework-index">
          {this.state.aggregateArray && this.state.aggregateArray.map(hw =>  <AggregatedIndexCard clickHandler={() => this.goToHwByQ(hw.setDate)} key={hw.setDate} {...hw} />)}
        </div>
      </main>
    );
  }
}

export default PupilIndex;
