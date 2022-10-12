import React from 'react'
import Elo from './elo'
import {CDN_PORTRAIT_URL, TitleName} from '../../../../types'

export default function Avatar(props:{elo: number|undefined, name: string, avatar: string, title: string}){
    const elo = props.elo ? <Elo elo={props.elo}/>: null

    return <div className='playerBox my-cursor' style={{display:'flex', justifyContent:'space-around', alignItems: 'center', flexFlow:'column'}}>
        <div style={{display:'flex', gap:'5px'}}>
            <img style={{width:'40px',height:'40px'}} src={`${CDN_PORTRAIT_URL}${props.avatar}.png`}/>
            <p style={{margin:'0px', color: '#ffc107'}}>{TitleName[props.title]}</p>
            <p style={{margin:'0px'}}>{props.name}</p>
        </div>
        {elo}
    </div>
}