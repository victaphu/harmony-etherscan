import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      EtherScan API Proxy to Harmony Verification Service <br/>
      Send Etherscan API calls through this to verify your contract 
    </div>
  )
}
