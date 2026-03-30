import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Ip {
  constructor(private http: HttpClient) {
  }

  public getIpAddress(): Observable<any> {
    return this.http.get("api.ipify.org")
  }
}
